// app/api/webhooks/gmail/route.js
// COMPLETE REPLACEMENT FILE - Gmail webhook that creates leads
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDbClient, query } from '../../../../lib/database.js';
import { 
  saveGmailConnection,
  getGmailConnection,
  createOrUpdateConversation,
  saveGmailMessage,
  updateConversationActivity,
  logAIResponse
} from '../../../../lib/gmail-database.js';
import { 
  createOrUpdateContact,
  trackLeadEventWithContact,
  updateLeadScoring
} from '../../../../lib/leads-service.js';
import { checkEmailFilter } from '../../../../lib/email-filtering.js';
import { generateAIResponseWithLeadTracking } from '../../../../lib/ai-service.js';

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
      threadId = emailData.threadId || emailData.thread_id,
      userId = emailData.userId || emailData.user_id,
      gmailAccountEmail = emailData.gmailAccountEmail || to || emailData.accountEmail
    } = emailData;
    
    // For real Gmail webhooks, the 'to' field contains YOUR Gmail account
    // This is the key to identifying which customer this email belongs to
    console.log('📬 Email TO (your Gmail):', gmailAccountEmail);
    console.log('📤 Email FROM (the lead):', from);
    
    console.log('📨 Processing email from:', from);
    console.log('📝 Subject:', subject);
    
    // Step 1: Extract sender information
    const senderInfo = extractSenderInfo(from);
    console.log('👤 Extracted sender info:', senderInfo);
    
    // Step 2: Get Gmail connection and customer info
    const connectionInfo = await getConnectionAndCustomerInfo(userId, gmailAccountEmail);
    if (!connectionInfo) {
      console.error('❌ No Gmail connection or customer found');
      return NextResponse.json({ 
        error: 'No Gmail connection or customer found',
        userId,
        gmailAccountEmail
      }, { status: 404 });
    }
    
    const { gmailConnection, customer } = connectionInfo;
    console.log('✅ Found customer:', customer.business_name, '(ID:', customer.id, ')');
    
    // Step 3: Check email filters
    const filterSettings = await getEmailFilterSettings(customer.id);
    const filterResult = await checkEmailFilter(
      { from, subject, body },
      filterSettings
    );
    
    if (filterResult.shouldFilter) {
      console.log('🚫 Email filtered:', filterResult.reason);
      return NextResponse.json({ 
        success: true,
        filtered: true,
        reason: filterResult.reason
      });
    }
    
    // Step 4: CREATE OR UPDATE LEAD/CONTACT 🎯
    console.log('🎯 Creating/updating lead for:', senderInfo.email);
    const contactResult = await createOrUpdateContact(customer.id, {
      email: senderInfo.email,
      name: senderInfo.name || 'Unknown',
      source_channel: 'gmail',
      tags: ['email-lead']
    });
    
    if (!contactResult.success) {
      console.error('❌ Failed to create/update contact:', contactResult.error);
      throw new Error('Failed to create contact');
    }
    
    const contact = contactResult.contact;
    console.log('✅ Lead created/updated:', {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      action: contactResult.action
    });
    
    // Step 5: Save conversation and message to database
    const conversation = await createOrUpdateConversation({
      gmail_connection_id: gmailConnection.id,
      thread_id: threadId || messageId,
      customer_email: senderInfo.email,
      customer_name: senderInfo.name,
      subject: subject
    });
    
    await saveGmailMessage({
      conversation_id: conversation.id,
      gmail_message_id: messageId,
      thread_id: threadId || messageId,
      sender_type: 'customer',
      sender_email: senderInfo.email,
      recipient_email: gmailAccountEmail,
      subject: subject,
      content: body,
      content_type: 'text/plain',
      sent_at: new Date()
    });
    
    await updateConversationActivity(conversation.id, 'customer');
    
    // Step 6: Track as lead event
    console.log('📊 Tracking lead event...');
    await trackLeadEventWithContact(customer.id, contact.id, {
      type: 'email_received',
      channel: 'gmail',
      message: body,
      metadata: {
        subject: subject,
        from: from,
        gmail_message_id: messageId
      }
    });
    
    // Step 7: Generate AI response if enabled
    let aiResponse = null;
    if (customer.ai_enabled !== false) {
      console.log('🤖 Generating AI response...');
      
      const aiResult = await generateAIResponseWithLeadTracking({
        userMessage: body,
        channel: 'gmail',
        customerEmail: customer.email,
        customerPhone: null,
        customerName: senderInfo.name,
        clerkUserId: customer.clerk_user_id,
        conversationHistory: [],
        channelSpecificData: { subject }
      });
      
      if (aiResult.success) {
        aiResponse = aiResult.response;
        console.log('✅ AI response generated');
        
        // Log AI response
        await logAIResponse({
          gmail_connection_id: gmailConnection.id,
          conversation_id: conversation.id,
          customer_message: body,
          ai_response: aiResponse,
          model_used: aiResult.metadata?.model || 'gpt-4o-mini',
          temperature: 0.7,
          response_time_ms: Date.now() - new Date(conversation.created_at).getTime(),
          tokens_used: aiResult.metadata?.tokensUsed || 0
        });
        
        // Save AI response as a message
        await saveGmailMessage({
          conversation_id: conversation.id,
          gmail_message_id: `ai_${messageId}_response`,
          thread_id: threadId || messageId,
          sender_type: 'ai',
          sender_email: gmailAccountEmail,
          recipient_email: senderInfo.email,
          subject: `Re: ${subject}`,
          content: aiResponse,
          content_type: 'text/plain',
          is_ai_generated: true,
          ai_model: aiResult.metadata?.model || 'gpt-4o-mini',
          sent_at: new Date()
        });
        
        await updateConversationActivity(conversation.id, 'ai');
        
        // Track hot lead if detected
        if (aiResult.hotLead?.isHotLead) {
          console.log('🔥 Hot lead detected! Score:', aiResult.hotLead.score);
          await trackLeadEventWithContact(customer.id, contact.id, {
            type: 'hot_lead',
            channel: 'gmail',
            message: `Hot lead detected with score ${aiResult.hotLead.score}`,
            metadata: {
              score: aiResult.hotLead.score,
              reasoning: aiResult.hotLead.reasoning,
              keywords: aiResult.hotLead.keywords
            },
            confidence_score: aiResult.hotLead.score
          });
        }
      }
    }
    
    // Step 8: Update lead scoring
    console.log('📈 Updating lead score...');
    const scoringResult = await updateLeadScoring(customer.id, contact.id);
    console.log('✅ Lead scoring updated:', {
      score: scoringResult.score,
      temperature: scoringResult.temperature,
      value: scoringResult.potential_value
    });
    
    // Step 9: Send AI response via Gmail if generated
    if (aiResponse && gmailConnection.access_token) {
      try {
        await sendGmailResponse({
          gmailConnection,
          to: senderInfo.email,
          subject: `Re: ${subject}`,
          body: aiResponse,
          threadId: threadId,
          messageId: messageId
        });
        console.log('📤 AI response sent via Gmail');
      } catch (sendError) {
        console.error('❌ Failed to send Gmail response:', sendError);
        // Don't fail the whole webhook if sending fails
      }
    }
    
    // Success response with all the details
    return NextResponse.json({ 
      success: true,
      message: 'Email processed and lead created successfully',
      lead: {
        id: contact.id,
        email: contact.email,
        name: contact.name,
        score: scoringResult.score,
        temperature: scoringResult.temperature,
        potential_value: scoringResult.potential_value,
        action: contactResult.action // 'created' or 'updated'
      },
      conversation: {
        id: conversation.id,
        thread_id: conversation.thread_id,
        subject: conversation.subject
      },
      ai_response_generated: !!aiResponse,
      filtered: false
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
 * 🔍 Get Gmail connection and customer information
 * FIXED: Now properly finds customer by Gmail account
 */
async function getConnectionAndCustomerInfo(userId, gmailAccountEmail) {
  try {
    // Method 1: Try to find by Gmail account email (MOST RELIABLE)
    if (gmailAccountEmail) {
      console.log('🔍 Looking for Gmail connection by email:', gmailAccountEmail);
      
      // Find the Gmail connection (using gmail_email column)
      const connectionResult = await query(`
        SELECT 
          gc.*,
          c.id as customer_id,
          c.business_name,
          c.email as customer_email,
          c.clerk_user_id,
          c.ai_enabled
        FROM gmail_connections gc
        JOIN customers c ON (gc.user_id = c.clerk_user_id OR gc.user_id = c.user_id::text)
        WHERE gc.gmail_email = $1 
          AND gc.status = 'connected'
        LIMIT 1
      `, [gmailAccountEmail]);
      
      if (connectionResult.rows[0]) {
        const row = connectionResult.rows[0];
        console.log('✅ Found customer by Gmail account:', row.business_name);
        return {
          gmailConnection: {
            id: row.id,
            email: row.gmail_email,  // Using gmail_email column
            access_token: row.access_token,
            refresh_token: row.refresh_token,
            token_expiry: row.token_expiry
          },
          customer: {
            id: row.customer_id,
            business_name: row.business_name,
            email: row.customer_email,
            clerk_user_id: row.clerk_user_id,
            ai_enabled: row.ai_enabled
          }
        };
      }
    }
    
    // Method 2: Try to find by user_id if provided
    if (userId) {
      console.log('🔍 Looking for customer by user ID:', userId);
      
      const customerResult = await query(
        'SELECT * FROM customers WHERE clerk_user_id = $1 OR user_id = $1::text LIMIT 1',
        [userId]
      );
      
      if (customerResult.rows[0]) {
        const customer = customerResult.rows[0];
        
        // Get their Gmail connection
        const gmailConnection = await getGmailConnection(
          customer.clerk_user_id || customer.user_id
        );
        
        if (gmailConnection) {
          console.log('✅ Found customer by user ID:', customer.business_name);
          return { gmailConnection, customer };
        }
      }
    }
    
    // Method 3: If all else fails, use the first active customer (for testing)
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_TEST_MODE === 'true') {
      console.log('⚠️ No customer found, using first customer for testing');
      const fallbackResult = await query(`
        SELECT 
          c.*,
          gc.id as gmail_connection_id,
          gc.gmail_email as gmail_email,
          gc.access_token,
          gc.refresh_token,
          gc.token_expiry
        FROM customers c
        LEFT JOIN gmail_connections gc ON (gc.user_id = c.clerk_user_id OR gc.user_id = c.user_id::text)
        WHERE gc.status = 'connected'
        LIMIT 1
      `);
      
      if (fallbackResult.rows[0]) {
        const row = fallbackResult.rows[0];
        console.log('⚠️ Using fallback customer:', row.business_name);
        return {
          gmailConnection: {
            id: row.gmail_connection_id,
            email: row.gmail_email,
            access_token: row.access_token,
            refresh_token: row.refresh_token,
            token_expiry: row.token_expiry
          },
          customer: row
        };
      }
    }
    
    console.error('❌ No customer or Gmail connection found');
    return null;
  } catch (error) {
    console.error('❌ Error getting connection info:', error);
    return null;
  }
}

/**
 * 🔧 Get email filter settings for customer
 */
async function getEmailFilterSettings(customerId) {
  try {
    const result = await query(
      'SELECT * FROM email_settings WHERE customer_id = $1 LIMIT 1',
      [customerId]
    );
    
    return result.rows[0] || {
      auto_archive_spam: true,
      block_mass_emails: true,
      skip_auto_generated: true,
      personal_only: false,
      whitelist_emails: [],
      blacklist_emails: [],
      priority_keywords: []
    };
  } catch (error) {
    console.error('Error getting filter settings:', error);
    return {};
  }
}

/**
 * 📤 Send response via Gmail API
 */
async function sendGmailResponse({ gmailConnection, to, subject, body, threadId, messageId }) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token: gmailConnection.access_token,
      refresh_token: gmailConnection.refresh_token,
      expiry_date: gmailConnection.token_expiry
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Create email message
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      messageId ? `In-Reply-To: ${messageId}` : '',
      messageId ? `References: ${messageId}` : '',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].filter(line => line).join('\n');
    
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: threadId
      }
    });
    
    console.log('✅ Gmail response sent:', response.data.id);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error sending Gmail response:', error);
    throw error;
  }
}

/**
 * 🧪 GET endpoint for testing the webhook
 */
export async function GET(request) {
  return NextResponse.json({ 
    message: 'Gmail webhook endpoint is active',
    version: '2.0',
    features: [
      '✅ Processes incoming emails',
      '✅ Creates/updates leads automatically',
      '✅ Tracks lead events and interactions',
      '✅ Generates AI responses',
      '✅ Updates lead scoring',
      '✅ Applies email filters',
      '✅ Sends responses via Gmail'
    ],
    test_endpoint: '/api/webhooks/gmail/test'
  });
}
