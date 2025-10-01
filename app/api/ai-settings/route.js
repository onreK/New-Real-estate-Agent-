import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { getCustomerByClerkId, getDbClient } from '../../../lib/database';

// GET endpoint to load AI settings for all channels
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      // Create customer if not exists
      customer = await createCustomerIfNotExists(user);
    }

    const client = await getDbClient().connect();
    try {
      // First, ensure the ai_channel_settings table exists
      await ensureChannelSettingsTableExists(client);
      
      // Get all channel settings for this customer
      const query = 'SELECT * FROM ai_channel_settings WHERE customer_id = $1';
      const result = await client.query(query, [customer.id]);
      
      // Also get email settings as fallback for email channel
      const emailQuery = 'SELECT * FROM email_settings WHERE customer_id = $1';
      const emailResult = await client.query(emailQuery, [customer.id]);
      const emailSettings = emailResult.rows[0];
      
      // Structure the settings by channel
      const settings = {};
      
      // Process channel-specific settings
      result.rows.forEach(row => {
        settings[row.channel] = {
          businessName: row.business_name || '',
          industry: row.industry || '',
          businessDescription: row.business_description || '',
          responseTone: row.response_tone || 'Professional',
          responseLength: row.response_length || 'Short',
          knowledgeBase: row.knowledge_base || '',
          customInstructions: row.custom_instructions || '',
          // Channel-specific settings
          ...(row.channel === 'facebook' && {
            autoRespondMessages: row.auto_respond_messages || false,
            autoRespondComments: row.auto_respond_comments || false
          }),
          ...(row.channel === 'instagram' && {
            autoRespondDMs: row.auto_respond_dms || false,
            autoRespondComments: row.auto_respond_comments || false
          }),
          ...(row.channel === 'text' && {
            enableAutoResponses: row.enable_auto_responses || false,
            hotLeadDetection: row.hot_lead_detection || false,
            responseDelay: row.response_delay || ''
          }),
          ...(row.channel === 'chatbot' && {
            proactiveEngagement: row.proactive_engagement || false,
            collectContactInfo: row.collect_contact_info || false
          })
        };
      });
      
      // If no email channel settings, use data from email_settings table as fallback
      if (!settings.email && emailSettings) {
        settings.email = {
          businessName: customer.business_name || '',
          industry: emailSettings.expertise || '',
          businessDescription: emailSettings.specialties || '',
          responseTone: (emailSettings.tone || 'professional').charAt(0).toUpperCase() + (emailSettings.tone || 'professional').slice(1).toLowerCase(),
          responseLength: (emailSettings.response_length || 'short').charAt(0).toUpperCase() + (emailSettings.response_length || 'short').slice(1).toLowerCase(),
          knowledgeBase: emailSettings.knowledge_base || '',
          customInstructions: emailSettings.custom_instructions || emailSettings.ai_system_prompt || ''
        };
      }
      
      return NextResponse.json({
        success: true,
        settings: settings,
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

// POST endpoint to save AI settings for a specific channel
export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      customer = await createCustomerIfNotExists(user);
    }

    const body = await request.json();
    const { channel, settings } = body;
    
    console.log('💾 Saving AI settings for channel:', channel);
    console.log('Settings data:', settings);

    const client = await getDbClient().connect();
    try {
      // Ensure table exists
      await ensureChannelSettingsTableExists(client);
      
      // Check if settings exist for this channel
      const checkQuery = 'SELECT id FROM ai_channel_settings WHERE customer_id = $1 AND channel = $2';
      const checkResult = await client.query(checkQuery, [customer.id, channel]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings
        console.log('🔄 Updating existing settings for channel:', channel);
        
        // Build dynamic update query based on channel
        const baseFields = {
          business_name: settings.businessName || '',
          industry: settings.industry || '',
          business_description: settings.businessDescription || '',
          response_tone: settings.responseTone || 'Professional',
          response_length: settings.responseLength || 'Short',
          knowledge_base: settings.knowledgeBase || '',
          custom_instructions: settings.customInstructions || ''
        };
        
        // Add channel-specific fields
        const channelSpecificFields = {};
        
        if (channel === 'facebook') {
          channelSpecificFields.auto_respond_messages = settings.autoRespondMessages || false;
          channelSpecificFields.auto_respond_comments = settings.autoRespondComments || false;
        } else if (channel === 'instagram') {
          channelSpecificFields.auto_respond_dms = settings.autoRespondDMs || false;
          channelSpecificFields.auto_respond_comments = settings.autoRespondComments || false;
        } else if (channel === 'text') {
          channelSpecificFields.enable_auto_responses = settings.enableAutoResponses || false;
          channelSpecificFields.hot_lead_detection = settings.hotLeadDetection || false;
          channelSpecificFields.response_delay = settings.responseDelay || '';
        } else if (channel === 'chatbot') {
          channelSpecificFields.proactive_engagement = settings.proactiveEngagement || false;
          channelSpecificFields.collect_contact_info = settings.collectContactInfo || false;
        }
        
        const allFields = { ...baseFields, ...channelSpecificFields };
        const fieldNames = Object.keys(allFields);
        const setClause = fieldNames.map((field, index) => `${field} = $${index + 1}`).join(', ');
        
        query = `
          UPDATE ai_channel_settings 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $${fieldNames.length + 1} AND channel = $${fieldNames.length + 2}
          RETURNING *
        `;
        
        values = [...Object.values(allFields), customer.id, channel];
        
      } else {
        // Insert new settings
        console.log('➕ Creating new settings for channel:', channel);
        
        query = `
          INSERT INTO ai_channel_settings (
            customer_id, channel, business_name, industry, business_description,
            response_tone, response_length, knowledge_base, custom_instructions,
            auto_respond_messages, auto_respond_comments, auto_respond_dms,
            enable_auto_responses, hot_lead_detection, response_delay,
            proactive_engagement, collect_contact_info,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `;
        
        values = [
          customer.id,
          channel,
          settings.businessName || '',
          settings.industry || '',
          settings.businessDescription || '',
          settings.responseTone || 'Professional',
          settings.responseLength || 'Short',
          settings.knowledgeBase || '',
          settings.customInstructions || '',
          // Facebook settings
          channel === 'facebook' ? (settings.autoRespondMessages || false) : false,
          (channel === 'facebook' || channel === 'instagram') ? (settings.autoRespondComments || false) : false,
          // Instagram settings
          channel === 'instagram' ? (settings.autoRespondDMs || false) : false,
          // Text settings
          channel === 'text' ? (settings.enableAutoResponses || false) : false,
          channel === 'text' ? (settings.hotLeadDetection || false) : false,
          channel === 'text' ? (settings.responseDelay || '') : '',
          // Chatbot settings
          channel === 'chatbot' ? (settings.proactiveEngagement || false) : false,
          channel === 'chatbot' ? (settings.collectContactInfo || false) : false
        ];
      }

      const result = await client.query(query, values);
      const savedSettings = result.rows[0];
      
      // If email channel, also update email_settings table for compatibility
      if (channel === 'email' && settings) {
        try {
          const emailUpdateQuery = `
            UPDATE email_settings 
            SET expertise = $1, specialties = $2, knowledge_base = $3,
                custom_instructions = $4, ai_system_prompt = $5,
                tone = $6, response_length = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE customer_id = $8
          `;
          
          await client.query(emailUpdateQuery, [
            settings.industry || '',
            settings.businessDescription || '',
            settings.knowledgeBase || '',
            settings.customInstructions || '',
            settings.customInstructions || '',
            (settings.responseTone || 'Professional').toLowerCase(),
            (settings.responseLength || 'Short').toLowerCase(),
            customer.id
          ]);
          
          console.log('✅ Also updated email_settings table for compatibility');
        } catch (emailError) {
          console.log('Email settings update skipped:', emailError.message);
        }
      }

      console.log('✅ AI settings saved successfully for channel:', channel);
      
      return NextResponse.json({
        success: true,
        settings: savedSettings,
        message: `${channel} settings saved successfully`
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
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

// Helper function to ensure the ai_channel_settings table exists
async function ensureChannelSettingsTableExists(client) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_channel_settings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        channel VARCHAR(50) NOT NULL,
        business_name TEXT,
        industry TEXT,
        business_description TEXT,
        response_tone VARCHAR(50),
        response_length VARCHAR(50),
        knowledge_base TEXT,
        custom_instructions TEXT,
        
        -- Facebook specific
        auto_respond_messages BOOLEAN DEFAULT false,
        auto_respond_comments BOOLEAN DEFAULT false,
        
        -- Instagram specific
        auto_respond_dms BOOLEAN DEFAULT false,
        
        -- Text/SMS specific
        enable_auto_responses BOOLEAN DEFAULT false,
        hot_lead_detection BOOLEAN DEFAULT false,
        response_delay VARCHAR(50),
        
        -- Chatbot specific
        proactive_engagement BOOLEAN DEFAULT false,
        collect_contact_info BOOLEAN DEFAULT false,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(customer_id, channel)
      )
    `);
    
    console.log('✅ Ensured ai_channel_settings table exists');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}
