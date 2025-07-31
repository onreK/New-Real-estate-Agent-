// app/api/customer/ai-settings/route.js - ENHANCED WITH AI BEHAVIOR & MODEL SETTINGS
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
          // ✅ EXISTING Core fields
          ai_personality: settings.ai_personality || '',
          tone: settings.tone || 'professional',
          expertise: settings.expertise || '',
          specialties: settings.specialties || '',
          response_style: settings.response_style || '',
          knowledge_base: settings.knowledge_base || '',
          hot_lead_keywords: settings.hot_lead_keywords || ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
          auto_response_enabled: settings.auto_response_enabled !== false,
          alert_hot_leads: settings.alert_hot_leads !== false,
          include_availability: settings.include_availability !== false,
          ask_qualifying_questions: settings.ask_qualifying_questions !== false,
          require_approval: settings.require_approval === true,
          
          // 🎯 NEW: AI Behavior Settings
          ai_system_prompt: settings.ai_system_prompt || '',
          custom_instructions: settings.custom_instructions || '',
          always_ask_phone: settings.always_ask_phone === true,
          schedule_within_24h: settings.schedule_within_24h === true,
          highlight_advantages: settings.highlight_advantages === true,
          include_call_to_action: settings.include_call_to_action !== false,
          offer_callback_urgent: settings.offer_callback_urgent !== false,
          
          // ⚙️ NEW: AI Model Settings
          ai_model: settings.ai_model || 'gpt-4o-mini',
          ai_temperature: parseFloat(settings.ai_temperature) || 0.7,
          ai_max_tokens: parseInt(settings.ai_max_tokens) || 350,
          response_length: settings.response_length || 'medium',
          enable_hot_lead_analysis: settings.enable_hot_lead_analysis !== false,
          enable_ai_responses: settings.enable_ai_responses !== false
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
    console.log('💾 Saving enhanced AI settings for customer:', customer.business_name);

    // Extract all settings including new ones
    const { 
      // ✅ EXISTING Core settings
      ai_personality, tone, expertise, specialties, response_style, 
      hot_lead_keywords, auto_response_enabled, alert_hot_leads, 
      include_availability, ask_qualifying_questions, require_approval,
      knowledge_base,
      
      // 🎯 NEW: AI Behavior settings
      ai_system_prompt, custom_instructions, always_ask_phone,
      schedule_within_24h, highlight_advantages, include_call_to_action,
      offer_callback_urgent,
      
      // ⚙️ NEW: AI Model settings
      ai_model, ai_temperature, ai_max_tokens, response_length,
      enable_hot_lead_analysis, enable_ai_responses
    } = body;

    const client = await getDbClient().connect();
    try {
      // Check if settings exist
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings - ALL FIELDS
        console.log('🔄 Updating existing settings with new AI features');
        query = `
          UPDATE email_settings 
          SET ai_personality = $1, tone = $2, expertise = $3, specialties = $4,
              response_style = $5, hot_lead_keywords = $6, auto_response_enabled = $7, 
              alert_hot_leads = $8, include_availability = $9, ask_qualifying_questions = $10, 
              require_approval = $11, knowledge_base = $12,
              ai_system_prompt = $13, custom_instructions = $14, always_ask_phone = $15,
              schedule_within_24h = $16, highlight_advantages = $17, include_call_to_action = $18,
              offer_callback_urgent = $19, ai_model = $20, ai_temperature = $21, 
              ai_max_tokens = $22, response_length = $23, enable_hot_lead_analysis = $24,
              enable_ai_responses = $25, updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $26
          RETURNING *
        `;
        values = [
          // ✅ EXISTING Core settings
          ai_personality || '',
          tone || 'professional',
          expertise || '',
          specialties || '',
          response_style || '',
          hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready'],
          auto_response_enabled !== false,
          alert_hot_leads !== false,
          include_availability !== false,
          ask_qualifying_questions !== false,
          require_approval === true,
          knowledge_base || '',
          
          // 🎯 NEW: AI Behavior settings
          ai_system_prompt || '',
          custom_instructions || '',
          always_ask_phone === true,
          schedule_within_24h === true,
          highlight_advantages === true,
          include_call_to_action !== false,
          offer_callback_urgent !== false,
          
          // ⚙️ NEW: AI Model settings
          ai_model || 'gpt-4o-mini',
          parseFloat(ai_temperature) || 0.7,
          parseInt(ai_max_tokens) || 350,
          response_length || 'medium',
          enable_hot_lead_analysis !== false,
          enable_ai_responses !== false,
          
          customer.id
        ];
      } else {
        // Insert new settings - ALL FIELDS
        console.log('➕ Creating new settings with all AI features');
        query = `
          INSERT INTO email_settings (
            customer_id, ai_personality, tone, expertise, specialties, response_style,
            hot_lead_keywords, auto_response_enabled, alert_hot_leads, include_availability,
            ask_qualifying_questions, require_approval, knowledge_base,
            ai_system_prompt, custom_instructions, always_ask_phone, schedule_within_24h,
            highlight_advantages, include_call_to_action, offer_callback_urgent,
            ai_model, ai_temperature, ai_max_tokens, response_length,
            enable_hot_lead_analysis, enable_ai_responses,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `;
        values = [
          customer.id,
          // ✅ EXISTING Core settings
          ai_personality || '',
          tone || 'professional',
          expertise || '',
          specialties || '',
          response_style || '',
          hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready'],
          auto_response_enabled !== false,
          alert_hot_leads !== false,
          include_availability !== false,
          ask_qualifying_questions !== false,
          require_approval === true,
          knowledge_base || '',
          
          // 🎯 NEW: AI Behavior settings
          ai_system_prompt || '',
          custom_instructions || '',
          always_ask_phone === true,
          schedule_within_24h === true,
          highlight_advantages === true,
          include_call_to_action !== false,
          offer_callback_urgent !== false,
          
          // ⚙️ NEW: AI Model settings
          ai_model || 'gpt-4o-mini',
          parseFloat(ai_temperature) || 0.7,
          parseInt(ai_max_tokens) || 350,
          response_length || 'medium',
          enable_hot_lead_analysis !== false,
          enable_ai_responses !== false
        ];
      }

      const result = await client.query(query, values);
      const savedSettings = result.rows[0];

      console.log('✅ AI settings saved successfully with new features');
      
      return NextResponse.json({
        success: true,
        settings: savedSettings,
        message: 'AI settings saved successfully with enhanced features!',
        features_enabled: {
          ai_behavior_settings: true,
          ai_model_settings: true,
          hot_lead_analysis: enable_hot_lead_analysis !== false,
          custom_instructions: !!(ai_system_prompt || custom_instructions),
          advanced_model: ai_model !== 'gpt-3.5-turbo'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    
    // Handle specific database errors
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'Database column missing - run database migration',
        details: error.message,
        action: 'Contact support to add missing AI settings columns'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
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
