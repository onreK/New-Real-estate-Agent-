// app/api/customer/ai-settings/route.js - ENHANCED VERSION
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

    // Get customer from database (keeping your existing structure)
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get AI settings for this customer (keeping your existing query)
    const client = await getDbClient().connect();
    try {
      const query = 'SELECT * FROM email_settings WHERE customer_id = $1';
      const result = await client.query(query, [customer.id]);
      
      const settings = result.rows[0];
      
      return NextResponse.json({
        success: true,
        settings: settings ? {
          // Existing fields (keep as-is)
          ai_personality: settings.ai_personality || '',
          tone: settings.tone || 'professional',
          expertise: settings.expertise || '',
          specialties: settings.specialties || '',
          response_style: settings.response_style || '',
          hot_lead_keywords: settings.hot_lead_keywords || ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
          auto_response_enabled: settings.auto_response_enabled !== false,
          alert_hot_leads: settings.alert_hot_leads !== false,
          include_availability: settings.include_availability !== false,
          ask_qualifying_questions: settings.ask_qualifying_questions !== false,
          require_approval: settings.require_approval === true,
          
          // Enhanced fields for 3-tab system (with defaults if columns don't exist yet)
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

    // Get customer from database (keeping your existing structure)
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('💾 Saving enhanced AI settings for customer:', customer.business_name);

    // Extract all settings (existing + new)
    const { 
      // Existing fields
      tone, expertise, specialties, response_style, hot_lead_keywords,
      auto_response_enabled, alert_hot_leads, include_availability, 
      ask_qualifying_questions, require_approval,
      
      // New enhanced fields
      email_filtering,
      response_rules,
      monitoring
    } = body;

    const client = await getDbClient().connect();
    try {
      // Check if settings exist (keeping your existing logic)
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings - enhanced with new fields
        query = `
          UPDATE email_settings 
          SET tone = $1, expertise = $2, specialties = $3, response_style = $4,
              hot_lead_keywords = $5, auto_response_enabled = $6, alert_hot_leads = $7,
              include_availability = $8, ask_qualifying_questions = $9, require_approval = $10,
              auto_archive_spam = $11, block_mass_emails = $12, personal_only = $13, skip_auto_generated = $14,
              business_hours_only = $15, urgent_priority = $16,
              monitoring_enabled = $17, auto_refresh_interval = $18,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $19
          RETURNING *
        `;
        values = [
          tone, expertise, specialties, response_style, hot_lead_keywords,
          auto_response_enabled, alert_hot_leads, include_availability,
          ask_qualifying_questions, require_approval,
          // New filtering fields
          email_filtering?.auto_archive_spam !== false,
          email_filtering?.block_mass_emails !== false,
          email_filtering?.personal_only === true,
          email_filtering?.skip_auto_generated !== false,
          // New response rule fields
          response_rules?.business_hours_only !== false,
          response_rules?.urgent_priority !== false,
          // New monitoring fields
          monitoring?.enabled !== false,
          monitoring?.auto_refresh_interval || 30,
          customer.id
        ];
      } else {
        // Create new settings with all fields (existing + enhanced)
        query = `
          INSERT INTO email_settings (
            customer_id, setup_method, business_name, email_address,
            tone, expertise, specialties, response_style, hot_lead_keywords,
            auto_response_enabled, alert_hot_leads, include_availability,
            ask_qualifying_questions, require_approval,
            auto_archive_spam, block_mass_emails, personal_only, skip_auto_generated,
            business_hours_only, urgent_priority,
            monitoring_enabled, auto_refresh_interval
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING *
        `;
        values = [
          customer.id, 'intellihub', customer.business_name, 
          `${customer.business_name.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`,
          tone, expertise, specialties, response_style, hot_lead_keywords,
          auto_response_enabled, alert_hot_leads, include_availability,
          ask_qualifying_questions, require_approval,
          // New filtering fields
          email_filtering?.auto_archive_spam !== false,
          email_filtering?.block_mass_emails !== false,
          email_filtering?.personal_only === true,
          email_filtering?.skip_auto_generated !== false,
          // New response rule fields
          response_rules?.business_hours_only !== false,
          response_rules?.urgent_priority !== false,
          // New monitoring fields
          monitoring?.enabled !== false,
          monitoring?.auto_refresh_interval || 30
        ];
      }
      
      const result = await client.query(query, values);
      
      console.log('✅ Enhanced AI settings saved for customer:', customer.business_name);
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0],
        message: 'Enhanced AI settings saved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving enhanced AI settings:', error);
    
    // If error is about missing columns, provide helpful message
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Database needs updating for new features',
        details: 'Please run the database update script to add new columns',
        missingColumns: true
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to save enhanced AI settings',
      details: error.message 
    }, { status: 500 });
  }
}
