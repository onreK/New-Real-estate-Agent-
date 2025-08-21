// app/api/webhooks/gmail/route.js
// COMPLETE SELF-CONTAINED Gmail webhook - No external dependencies except database
import { NextResponse } from 'next/server';
import { query } from '@/lib/database.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * 🎯 MAIN WEBHOOK HANDLER - Processes incoming Gmail messages and creates leads
 */
export async function POST(request) {
  try {
    console.log('📧 Gmail webhook received - Processing email and creating lead...');
    
    // Parse the incoming webhook data
    const webhookData = await request.json();
    console.log('📋 Webhook data received:', JSON.stringify(webhookData, null, 2));
    
    // Handle different webhook formats (Gmail API, Pub/Sub, or direct test)
    let emailData;
    if (webhookData.message && webhookData.message.data) {
      // Pub/Sub format
      const decodedData = Buffer.from(webhookData.message.data, 'base64').toString();
      emailData = JSON.parse(decodedData);
    } else if (webhookData.emailData) {
      // Direct test format
      emailData = webhookData.emailData;
    } else {
      // Assume the webhook data itself is the email data
      emailData = webhookData;
    }
    
    // Extract essential email information
    const {
      from = emailData.from || emailData.sender || emailData.email,
      to = emailData.to || emailData.recipient || emailData.gmailAccountEmail,
      subject = emailData.subject || 'No Subject',
      body = emailData.body || emailData.content || emailData.text || '',
      messageId = emailData.messageId || emailData.id || `msg_${Date.now()}`,
      threadId = emailData.threadId || emailData.thread_id || `thread_${Date.now()}`,
      userId = emailData.userId || emailData.user_id,
      gmailAccountEmail = emailData.gmailAccountEmail || to || emailData.accountEmail
    } = emailData;
    
    console.log('📬 Email TO (your Gmail):', gmailAccountEmail);
    console.log('📤 Email FROM (the lead):', from);
    console.log('📝 Subject:', subject);
    
    // Step 1: Extract sender information
    const senderInfo = extractSenderInfo(from);
    console.log('👤 Extracted sender info:', senderInfo);
    
    // Step 2: Find the customer (business owner) by Gmail account
    const customer = await findCustomerByGmail(gmailAccountEmail, userId);
    
    if (!customer) {
      console.log('⚠️ No customer found, using default customer ID 863');
      // Use your default customer ID 863 for testing
      const defaultCustomer = await query(
        'SELECT * FROM customers WHERE id = 863 LIMIT 1'
      );
      
      if (defaultCustomer.rows[0]) {
        customer = defaultCustomer.rows[0];
      } else {
        console.error('❌ Default customer not found');
        return NextResponse.json({ 
          error: 'No customer found for this Gmail account',
          gmailAccountEmail
        }, { status: 404 });
      }
    }
    
    console.log('✅ Found customer:', customer.business_name, '(ID:', customer.id, ')');
    
    // Step 3: CREATE OR UPDATE CONTACT IN CONTACTS TABLE
    console.log('🎯 Creating/updating contact for:', senderInfo.email);
    const contact = await createOrUpdateContact(customer.id, senderInfo, subject, body);
    
    if (!contact) {
      console.error('❌ Failed to create/update contact');
      throw new Error('Failed to create contact');
    }
    
    console.log('✅ Contact created/updated:', {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      score: contact.lead_score,
      temperature: contact.lead_temperature
    });
    
    // Step 4: Save Gmail message to database
    await saveGmailMessage(customer.id, contact.id, {
      threadId,
      messageId,
      senderEmail: senderInfo.email,
      senderName: senderInfo.name,
      recipientEmail: gmailAccountEmail,
      subject,
      body
    });
    
    // Step 5: Track lead event
    await trackContactEvent(customer.id, contact.id, 'email_received', {
      subject,
      from: senderInfo.email,
      gmail_message_id: messageId,
      preview: body.substring(0, 200)
    });
    
    // Step 6: Check for hot lead indicators
    const isHotLead = checkHotLeadIndicators(subject, body);
    if (isHotLead) {
      console.log('🔥 HOT LEAD DETECTED!');
      await createHotLeadAlert(customer.id, contact.id, subject, body);
      await trackContactEvent(customer.id, contact.id, 'hot_lead_detected', {
        reason: 'High-intent keywords in email',
        subject
      });
      
      // Update contact to hot status
      await query(`
        UPDATE contacts 
        SET 
          lead_temperature = 'hot',
          hot_lead_count = COALESCE(hot_lead_count, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [contact.id]);
    }
    
    // Step 7: Update interaction metrics
    await updateContactMetrics(contact.id);
    
    // Success response
    return NextResponse.json({ 
      success: true,
      message: 'Email processed and lead created successfully',
      lead: {
        id: contact.id,
        email: contact.email,
        name: contact.name,
        score: contact.lead_score,
        temperature: contact.lead_temperature,
        customer_id: customer.id
      },
      hot_lead: isHotLead,
      customer: {
        id: customer.id,
        business_name: customer.business_name
      }
    });
    
  } catch (error) {
    console.error('❌ Gmail webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * 📧 Extract sender information from email address string
 */
function extractSenderInfo(from) {
  if (!from) {
    return { email: 'unknown@email.com', name: 'Unknown Sender' };
  }
  
  // Handle format: "John Doe <john@example.com>"
  const match = from.match(/^([^<]*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim() || null,
      email: match[2].trim().toLowerCase()
    };
  }
  
  // Handle plain email address
  if (from.includes('@')) {
    return {
      email: from.trim().toLowerCase(),
      name: null
    };
  }
  
  // Fallback
  return {
    email: from.toLowerCase(),
    name: null
  };
}

/**
 * 🔍 Find customer by Gmail account
 */
async function findCustomerByGmail(gmailAccountEmail, userId) {
  try {
    // Special handling for your known Gmail account
    if (gmailAccountEmail === 'kernojunk@gmail.com') {
      console.log('🎯 Using known mapping for kernojunk@gmail.com');
      const result = await query(
        'SELECT * FROM customers WHERE id = 863 LIMIT 1'
      );
      if (result.rows[0]) return result.rows[0];
    }
    
    // Try to find via gmail_connections table
    if (gmailAccountEmail) {
      console.log('🔍 Looking for Gmail connection by email:', gmailAccountEmail);
      
      const connectionResult = await query(`
        SELECT c.* 
        FROM customers c
        JOIN gmail_connections gc ON gc.customer_id = c.id
        WHERE gc.gmail_email = $1 
          AND gc.status = 'connected'
        LIMIT 1
      `, [gmailAccountEmail]);
      
      if (connectionResult.rows[0]) {
        return connectionResult.rows[0];
      }
      
      // Also try user_id based lookup
      const userConnectionResult = await query(`
        SELECT c.* 
        FROM customers c
        JOIN gmail_connections gc ON (gc.user_id = c.clerk_user_id OR gc.user_id = c.user_id::text)
        WHERE gc.gmail_email = $1 
          AND gc.status = 'connected'
        LIMIT 1
      `, [gmailAccountEmail]);
      
      if (userConnectionResult.rows[0]) {
        return userConnectionResult.rows[0];
      }
    }
    
    // Try to find by user_id if provided
    if (userId) {
      console.log('🔍 Looking for customer by user ID:', userId);
      
      const customerResult = await query(
        'SELECT * FROM customers WHERE clerk_user_id = $1 OR user_id = $1::text LIMIT 1',
        [userId]
      );
      
      if (customerResult.rows[0]) {
        return customerResult.rows[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding customer:', error.message);
    return null;
  }
}

/**
 * 👤 Create or update contact in the contacts table
 */
async function createOrUpdateContact(customerId, senderInfo, subject, body) {
  try {
    // Check if contact exists
    const existing = await query(`
      SELECT * FROM contacts 
      WHERE customer_id = $1 
        AND email = $2
      LIMIT 1
    `, [customerId, senderInfo.email]);
    
    const leadScore = calculateLeadScore(subject, body);
    const temperature = leadScore >= 70 ? 'hot' : leadScore >= 40 ? 'warm' : 'cold';
    
    if (existing.rows[0]) {
      // Update existing contact
      console.log('📝 Updating existing contact...');
      const result = await query(`
        UPDATE contacts 
        SET 
          name = COALESCE($1, name),
          last_interaction_at = CURRENT_TIMESTAMP,
          total_interactions = COALESCE(total_interactions, 0) + 1,
          lead_score = GREATEST(COALESCE(lead_score, 0), $2),
          lead_temperature = $3,
          channels_used = ARRAY(SELECT DISTINCT unnest(COALESCE(channels_used, ARRAY[]::text[]) || ARRAY['gmail']::text[])),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [senderInfo.name, leadScore, temperature, existing.rows[0].id]);
      
      return result.rows[0];
    } else {
      // Create new contact
      console.log('🆕 Creating new contact...');
      const result = await query(`
        INSERT INTO contacts (
          customer_id, email, name, 
          lead_score, lead_temperature, lead_status,
          first_interaction_at, last_interaction_at,
          total_interactions, source_channel,
          channels_used, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'new',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          1, 'gmail', ARRAY['gmail']::text[],
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `, [
        customerId,
        senderInfo.email,
        senderInfo.name || 'Unknown',
        leadScore,
        temperature
      ]);
      
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error creating/updating contact:', error);
    
    // If error is due to missing columns, try simpler insert
    if (error.message.includes('column')) {
      console.log('⚠️ Trying simplified contact creation...');
      try {
        // Check if table exists and what columns it has
        const tableCheck = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'contacts'
        `);
        
        if (tableCheck.rows.length === 0) {
          console.error('❌ Contacts table does not exist!');
          return null;
        }
        
        // Try minimal insert with only required fields
        const minimalResult = await query(`
          INSERT INTO contacts (customer_id, email, name) 
          VALUES ($1, $2, $3) 
          ON CONFLICT (customer_id, email) 
          DO UPDATE SET 
            name = COALESCE($3, contacts.name),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [customerId, senderInfo.email, senderInfo.name || 'Unknown']);
        
        return minimalResult.rows[0];
      } catch (minimalError) {
        console.error('Even minimal contact creation failed:', minimalError);
        return null;
      }
    }
    
    return null;
  }
}

/**
 * 💾 Save Gmail message to database
 */
async function saveGmailMessage(customerId, contactId, messageData) {
  try {
    // First check if gmail_messages table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gmail_messages'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ gmail_messages table does not exist, skipping message save');
      return null;
    }
    
    // Try to insert the message
    const result = await query(`
      INSERT INTO gmail_messages (
        thread_id, message_id,
        sender_email, sender_name, recipient_email,
        subject, body_text,
        is_from_customer, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP
      ) RETURNING id
    `, [
      messageData.threadId,
      messageData.messageId,
      messageData.senderEmail,
      messageData.senderName,
      messageData.recipientEmail,
      messageData.subject,
      messageData.body
    ]);
    
    console.log('✅ Gmail message saved');
    return result.rows[0];
  } catch (error) {
    console.log('⚠️ Could not save Gmail message (non-critical):', error.message);
    return null;
  }
}

/**
 * 📊 Track contact event
 */
async function trackContactEvent(customerId, contactId, eventType, metadata) {
  try {
    // Try contact_events table first
    const contactEventsExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'contact_events'
      )
    `);
    
    if (contactEventsExists.rows[0].exists) {
      await query(`
        INSERT INTO contact_events (
          customer_id, contact_id, event_type,
          event_category, channel, description, metadata,
          created_at
        ) VALUES (
          $1, $2, $3, 'engagement', 'gmail',
          $4, $5, CURRENT_TIMESTAMP
        )
      `, [
        customerId,
        contactId,
        eventType,
        `${eventType} via Gmail`,
        JSON.stringify(metadata)
      ]);
      console.log(`✅ Event tracked in contact_events: ${eventType}`);
    }
    
    // Also try ai_analytics_events table
    const aiEventsExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_analytics_events'
      )
    `);
    
    if (aiEventsExists.rows[0].exists) {
      await query(`
        INSERT INTO ai_analytics_events (
          customer_id, contact_id, event_type,
          channel, metadata, created_at
        ) VALUES ($1, $2, $3, 'gmail', $4, CURRENT_TIMESTAMP)
      `, [customerId, contactId, eventType, JSON.stringify(metadata)]);
      console.log(`✅ Event tracked in ai_analytics_events: ${eventType}`);
    }
    
  } catch (error) {
    console.log('⚠️ Event tracking failed (non-critical):', error.message);
  }
}

/**
 * 📈 Calculate lead score based on email content
 */
function calculateLeadScore(subject, body) {
  let score = 10; // Base score
  const content = `${subject} ${body}`.toLowerCase();
  
  // High-intent keywords (20 points each)
  const highIntent = [
    'urgent', 'asap', 'immediately', 'buy', 'purchase', 
    'pricing', 'cost', 'quote', 'ready to', 'need now'
  ];
  
  // Medium-intent keywords (10 points each)
  const mediumIntent = [
    'interested', 'information', 'details', 'learn more', 
    'demo', 'trial', 'considering', 'looking for'
  ];
  
  // Count high-intent keywords
  highIntent.forEach(keyword => {
    if (content.includes(keyword)) score += 20;
  });
  
  // Count medium-intent keywords
  mediumIntent.forEach(keyword => {
    if (content.includes(keyword)) score += 10;
  });
  
  // Questions indicate interest
  if (content.includes('?')) score += 5;
  
  // Phone number or call request indicates high intent
  if (content.includes('call me') || content.includes('phone')) score += 15;
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(content)) score += 10; // Phone number pattern
  
  // Cap at 100
  return Math.min(score, 100);
}

/**
 * 🔥 Check for hot lead indicators
 */
function checkHotLeadIndicators(subject, body) {
  const content = `${subject} ${body}`.toLowerCase();
  const hotIndicators = [
    'urgent', 'asap', 'immediately', 'ready to buy',
    'want to purchase', 'need this today', 'call me',
    'ready to move forward', 'need now', 'emergency'
  ];
  
  let count = 0;
  hotIndicators.forEach(indicator => {
    if (content.includes(indicator)) count++;
  });
  
  // Hot lead if 2+ indicators found
  return count >= 2;
}

/**
 * 🚨 Create hot lead alert
 */
async function createHotLeadAlert(customerId, contactId, subject, body) {
  try {
    // Check if hot_leads table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hot_leads'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ hot_leads table does not exist');
      return null;
    }
    
    // Create hot lead record
    await query(`
      INSERT INTO hot_leads (
        customer_id, contact_id,
        reason, details, status,
        urgency_score, detected_at, created_at
      ) VALUES ($1, $2, $3, $4, 'new', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      customerId,
      contactId,
      `Hot lead from Gmail: ${subject}`,
      JSON.stringify({ 
        subject, 
        preview: body.substring(0, 500),
        source: 'gmail'
      }),
      80 // Default high urgency score
    ]);
    
    console.log('🚨 Hot lead alert created');
  } catch (error) {
    console.error('⚠️ Hot lead alert failed:', error.message);
  }
}

/**
 * 📊 Update contact metrics
 */
async function updateContactMetrics(contactId) {
  try {
    // Update the last_interaction_at timestamp
    await query(`
      UPDATE contacts 
      SET 
        last_interaction_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [contactId]);
    
    console.log('✅ Contact metrics updated');
  } catch (error) {
    console.log('⚠️ Metrics update failed (non-critical):', error.message);
  }
}

/**
 * 🧪 GET endpoint for testing the webhook
 */
export async function GET(request) {
  return NextResponse.json({ 
    message: 'Gmail webhook endpoint is active',
    version: '3.0',
    status: 'ready',
    features: [
      '✅ Processes incoming emails',
      '✅ Creates/updates contacts in centralized database',
      '✅ Tracks lead events and interactions',
      '✅ Calculates lead scores automatically',
      '✅ Detects hot leads with keyword analysis',
      '✅ Updates lead temperature (hot/warm/cold)',
      '✅ Tracks in multiple tables (contacts, events, hot_leads)'
    ],
    test_instructions: 'Send POST request with emailData object to test',
    database: 'Using centralized multi-tenant database with contacts table'
  });
}
