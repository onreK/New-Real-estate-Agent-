// app/api/customer/ai-settings/route.js - SIMPLIFIED VERSION FOR KNOWLEDGE BASE
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
    let customer = await getCustomerByClerkId(user.id);
    
    // If customer not found, create one
    if (!customer) {
      customer = await createCustomerIfNotExists(user);
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
          // Core fields only
          tone: settings.tone || 'professional',
          expertise: settings.expertise || '',
          specialties: settings.specialties || '',
          response_style: settings.response_style || '',
          knowledge_base: settings.knowledge_base || '', // NEW: Knowledge Base
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
    let customer = await getCustomerByClerkId(user.id);
    
    // If customer not found, create one
    if (!customer) {
      customer = await createCustomerIfNotExists(user);
    }

    const body = await request.json();
    console.log('💾 Saving simplified AI settings for customer:', customer.business_name);

    // Extract only the core settings that exist in your database
    const { 
      tone, expertise, specialties, response_style, hot_lead_keywords,
      auto_response_enabled, alert_hot_leads, include_availability, 
      ask_qualifying_questions, require_approval,
      knowledge_base // NEW: Knowledge Base field
    } = body;

    const client = await getDbClient().connect();
    try {
      // Check if settings exist
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings - CORE FIELDS ONLY
        console.log('🔄 Updating existing settings');
        query = `
          UPDATE email_settings 
          SET tone = $1, expertise = $2, specialties = $3, response_style = $4,
              hot_lead_keywords = $5, auto_response_enabled = $6, alert_hot_leads = $7,
              include_availability = $8, ask_qualifying_questions = $9, require_approval = $10,
              knowledge_base = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $12
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
          customer.id
        ];
      } else {
        // Create new settings - CORE FIELDS ONLY
        console.log('➕ Creating new settings');
        query = `
          INSERT INTO email_settings (
            customer_id, setup_method, business_name, email_address,
            tone, expertise, specialties, response_style, hot_lead_keywords,
            auto_response_enabled, alert_hot_leads, include_availability,
            ask_qualifying_questions, require_approval, knowledge_base
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
          knowledge_base || '' // NEW: Knowledge base
        ];
      }
      
      const result = await client.query(query, values);
      
      console.log('✅ Simplified AI settings with knowledge base saved successfully');
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0],
        message: 'AI settings with knowledge base saved successfully!'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    
    if (error.message.includes('knowledge_base') && error.message.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Knowledge base column missing from database',
        details: 'Please run: /api/admin/add-knowledge-base'
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
    const businessName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}'s Business`
      : 'My Business';
    
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
      user.id, businessName, email, 'starter'
    ]);
    
    return result.rows[0];
    
  } finally {
    client.release();
  }
}
