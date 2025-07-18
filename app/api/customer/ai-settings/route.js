// app/api/customer/ai-settings/route.js - FIXED VERSION THAT CREATES CUSTOMER IF MISSING
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getDbClient 
} from '../../../../lib/database';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Getting AI settings for user:', user.id);

    // Get or create customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    // If customer not found, create one
    if (!customer) {
      console.log('👤 Customer not found, creating new customer for:', user.id);
      customer = await createCustomerIfNotExists(user);
    }

    console.log('✅ Found/created customer:', customer.id, customer.business_name);

    // Get AI settings for this customer
    const client = await getDbClient().connect();
    try {
      const query = 'SELECT * FROM email_settings WHERE customer_id = $1';
      const result = await client.query(query, [customer.id]);
      
      const settings = result.rows[0];
      
      return NextResponse.json({
        success: true,
        settings: settings ? {
          // Existing fields
          ai_personality: settings.ai_personality || '',
          tone: settings.tone || 'professional',
          expertise: settings.expertise || '',
          specialties: settings.specialties || '',
          response_style: settings.response_style || '',
          
          // NEW: Knowledge Base field
          knowledge_base: settings.knowledge_base || '',
          
          hot_lead_keywords: settings.hot_lead_keywords || ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
          auto_response_enabled: settings.auto_response_enabled !== false,
          alert_hot_leads: settings.alert_hot_leads !== false,
          include_availability: settings.include_availability !== false,
          ask_qualifying_questions: settings.ask_qualifying_questions !== false,
          require_approval: settings.require_approval === true,
          
          // Enhanced fields for 3-tab system
          email_filtering: {
            auto_archive_spam: settings.auto_archive_spam !== false,
            block_mass_emails: settings.block_mass_emails !== false,
            personal_only: settings.personal_only === true,
            skip_auto_generated: settings.skip_auto_generated !== false
          },
          response_rules: {
            business_hours_only: settings.business_hours_only !== false,
            urgent_priority: settings.urgent_priority !== false,
            require_approval: settings.require_approval === true
          },
          monitoring: {
            enabled: settings.monitoring_enabled !== false,
            last_check: settings.last_monitored || null,
            auto_refresh_interval: settings.auto_refresh_interval || 30
          }
        } : null,
        customer: {
          id: customer.id,
          business_name: customer.business_name,
          email: customer.email
        }
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error getting AI settings:', error);
    return NextResponse.json({ 
      error: 'Failed to get AI settings',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('💾 Saving AI settings for user:', user.id);

    // Get or create customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    // If customer not found, create one
    if (!customer) {
      console.log('👤 Customer not found during save, creating new customer for:', user.id);
      customer = await createCustomerIfNotExists(user);
    }

    console.log('✅ Using customer:', customer.id, customer.business_name);

    const body = await request.json();
    console.log('📊 Request body:', body);

    // Extract all settings including knowledge base
    const { 
      tone, expertise, specialties, response_style, hot_lead_keywords,
      auto_response_enabled, alert_hot_leads, include_availability, 
      ask_qualifying_questions, require_approval,
      knowledge_base, // NEW: Knowledge Base field
      email_filtering,
      response_rules,
      monitoring
    } = body;

    const client = await getDbClient().connect();
    try {
      // Check if settings exist
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings with knowledge base
        console.log('🔄 Updating existing settings');
        query = `
          UPDATE email_settings 
          SET tone = $1, expertise = $2, specialties = $3, response_style = $4,
              hot_lead_keywords = $5, auto_response_enabled = $6, alert_hot_leads = $7,
              include_availability = $8, ask_qualifying_questions = $9, require_approval = $10,
              knowledge_base = $11,
              auto_archive_spam = $12, block_mass_emails = $13, personal_only = $14, skip_auto_generated = $15,
              business_hours_only = $16, urgent_priority = $17,
              monitoring_enabled = $18, auto_refresh_interval = $19,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $20
          RETURNING *
        `;
        values = [
          tone || 'professional',
          expertise || '',
          specialties || '',
          response_style || 'Knowledge-based responses',
          hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready'],
          auto_response_enabled !== false,
          alert_hot_leads !== false,
          include_availability !== false,
          ask_qualifying_questions !== false,
          require_approval === true,
          knowledge_base || '', // NEW: Knowledge base value
          // Filtering fields
          email_filtering?.auto_archive_spam !== false,
          email_filtering?.block_mass_emails !== false,
          email_filtering?.personal_only === true,
          email_filtering?.skip_auto_generated !== false,
          // Response rule fields
          response_rules?.business_hours_only !== false,
          response_rules?.urgent_priority !== false,
          // Monitoring fields
          monitoring?.enabled !== false,
          monitoring?.auto_refresh_interval || 30,
          customer.id
        ];
      } else {
        // Create new settings with knowledge base
        console.log('➕ Creating new settings');
        query = `
          INSERT INTO email_settings (
            customer_id, setup_method, business_name, email_address,
            tone, expertise, specialties, response_style, hot_lead_keywords,
            auto_response_enabled, alert_hot_leads, include_availability,
            ask_qualifying_questions, require_approval, knowledge_base,
            auto_archive_spam, block_mass_emails, personal_only, skip_auto_generated,
            business_hours_only, urgent_priority,
            monitoring_enabled, auto_refresh_interval
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          RETURNING *
        `;
        values = [
          customer.id,
          'intellihub',
          customer.business_name,
          customer.email || `${customer.business_name.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`,
          tone || 'professional',
          expertise || '',
          specialties || '',
          response_style || 'Knowledge-based responses',
          hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready'],
          auto_response_enabled !== false,
          alert_hot_leads !== false,
          include_availability !== false,
          ask_qualifying_questions !== false,
          require_approval === true,
          knowledge_base || '', // NEW: Knowledge base
          // Filtering fields
          email_filtering?.auto_archive_spam !== false,
          email_filtering?.block_mass_emails !== false,
          email_filtering?.personal_only === true,
          email_filtering?.skip_auto_generated !== false,
          // Response rule fields
          response_rules?.business_hours_only !== false,
          response_rules?.urgent_priority !== false,
          // Monitoring fields
          monitoring?.enabled !== false,
          monitoring?.auto_refresh_interval || 30
        ];
      }
      
      const result = await client.query(query, values);
      
      console.log('✅ AI settings with knowledge base saved successfully');
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0],
        message: 'AI settings with knowledge base saved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    console.error('❌ Error stack:', error.stack);
    
    if (error.message.includes('knowledge_base') && error.message.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Knowledge base column missing from database',
        details: 'Please run the database update script to add the knowledge_base column',
        missing_column: 'knowledge_base',
        fix_url: '/api/admin/add-knowledge-base'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to save AI settings',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to create customer if not exists
async function createCustomerIfNotExists(user) {
  const client = await getDbClient().connect();
  try {
    console.log('🔨 Creating new customer for Clerk user:', user.id);
    
    // Extract user information
    const businessName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}'s Business`
      : user.username || 'My Business';
    
    const email = user.emailAddresses?.[0]?.emailAddress || 'user@example.com';
    
    const insertQuery = `
      INSERT INTO customers (
        clerk_user_id, business_name, email, plan, 
        created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      user.id,
      businessName,
      email,
      'starter'
    ]);
    
    console.log('✅ Created new customer:', result.rows[0]);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    throw error;
  } finally {
    client.release();
  }
}
