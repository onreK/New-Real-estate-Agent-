// app/api/customer/ai-settings/route.js
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

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get AI settings for this customer
    const client = await getDbClient().connect();
    try {
      const query = 'SELECT * FROM email_settings WHERE customer_id = $1';
      const result = await client.query(query, [customer.id]);
      
      const settings = result.rows[0];
      
      return NextResponse.json({
        success: true,
        settings: settings ? {
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
          require_approval: settings.require_approval === true
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

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      tone, expertise, specialties, response_style, hot_lead_keywords,
      auto_response_enabled, alert_hot_leads, include_availability, 
      ask_qualifying_questions, require_approval 
    } = body;

    const client = await getDbClient().connect();
    try {
      // Check if settings exist
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings
        query = `
          UPDATE email_settings 
          SET tone = $1, expertise = $2, specialties = $3, response_style = $4,
              hot_lead_keywords = $5, auto_response_enabled = $6, alert_hot_leads = $7,
              include_availability = $8, ask_qualifying_questions = $9, require_approval = $10,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $11
          RETURNING *
        `;
        values = [
          tone, expertise, specialties, response_style, hot_lead_keywords,
          auto_response_enabled, alert_hot_leads, include_availability,
          ask_qualifying_questions, require_approval, customer.id
        ];
      } else {
        // Create new settings with basic email info
        query = `
          INSERT INTO email_settings (
            customer_id, setup_method, business_name, email_address,
            tone, expertise, specialties, response_style, hot_lead_keywords,
            auto_response_enabled, alert_hot_leads, include_availability,
            ask_qualifying_questions, require_approval
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;
        values = [
          customer.id, 'intellihub', customer.business_name, 
          `${customer.business_name.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`,
          tone, expertise, specialties, response_style, hot_lead_keywords,
          auto_response_enabled, alert_hot_leads, include_availability,
          ask_qualifying_questions, require_approval
        ];
      }
      
      const result = await client.query(query, values);
      
      console.log('✅ AI settings saved for customer:', customer.business_name);
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0],
        message: 'AI settings saved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    return NextResponse.json({ 
      error: 'Failed to save AI settings',
      details: error.message 
    }, { status: 500 });
  }
}
