import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '../../../lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📖 Getting AI config for user:', userId);

    // Get AI configuration from database
    const result = await query(
      'SELECT * FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    let config;
    if (result.rows.length > 0) {
      const dbConfig = result.rows[0];
      config = {
        personality: 'professional', // This will be mapped from system_prompt
        knowledgeBase: dbConfig.system_prompt || '',
        model: dbConfig.model || 'gpt-4o-mini',
        creativity: parseFloat(dbConfig.temperature) || 0.7,
        maxTokens: dbConfig.max_tokens || 500,
        systemPrompt: dbConfig.system_prompt || ''
      };
    } else {
      // Default configuration
      config = {
        personality: 'professional',
        knowledgeBase: '',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        systemPrompt: ''
      };
    }

    console.log('✅ AI Config loaded:', { userId, hasConfig: result.rows.length > 0 });
    return NextResponse.json(config);

  } catch (error) {
    console.error('❌ Error getting AI config:', error);
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('💾 Saving AI config for user:', userId, body);
    
    // Validate the configuration
    const validPersonalities = ['professional', 'friendly', 'enthusiastic', 'empathetic', 'expert'];
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    
    if (!validPersonalities.includes(body.personality)) {
      return NextResponse.json({ error: 'Invalid personality' }, { status: 400 });
    }
    
    if (!validModels.includes(body.model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }
    
    if (body.creativity < 0 || body.creativity > 1) {
      return NextResponse.json({ error: 'Creativity must be between 0 and 1' }, { status: 400 });
    }

    // Build the system prompt from personality and knowledge base
    let systemPrompt = '';
    
    // Add personality-based prompt
    switch (body.personality) {
      case 'professional':
        systemPrompt = 'You are a professional AI assistant. Be direct, helpful, and maintain a business-appropriate tone.';
        break;
      case 'friendly':
        systemPrompt = 'You are a friendly AI assistant. Be warm, conversational, and approachable while being helpful.';
        break;
      case 'enthusiastic':
        systemPrompt = 'You are an enthusiastic AI assistant. Be energetic, positive, and excited to help customers.';
        break;
      case 'empathetic':
        systemPrompt = 'You are an empathetic AI assistant. Be understanding, compassionate, and supportive in your responses.';
        break;
      case 'expert':
        systemPrompt = 'You are an expert AI assistant. Be technical, detailed, and authoritative in your responses.';
        break;
    }

    // Add knowledge base content
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      systemPrompt += '\n\nCustom Instructions:\n' + body.knowledgeBase.trim();
    }

    // Add custom system prompt if provided
    if (body.systemPrompt && body.systemPrompt.trim()) {
      systemPrompt += '\n\nAdditional Instructions:\n' + body.systemPrompt.trim();
    }

    // Check if configuration already exists
    const existingResult = await query(
      'SELECT id FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing configuration
      await query(
        `UPDATE ai_configs 
         SET model = $1, temperature = $2, max_tokens = $3, system_prompt = $4, 
             auto_response_enabled = $5, lead_detection_enabled = $6, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $7`,
        [
          body.model,
          parseFloat(body.creativity),
          parseInt(body.maxTokens),
          systemPrompt,
          true, // Enable auto responses when config is saved
          true, // Enable lead detection
          userId
        ]
      );
      console.log('✅ AI Config updated for user:', userId);
    } else {
      // Create new configuration
      await query(
        `INSERT INTO ai_configs (user_id, model, temperature, max_tokens, system_prompt, auto_response_enabled, lead_detection_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          body.model,
          parseFloat(body.creativity),
          parseInt(body.maxTokens),
          systemPrompt,
          true, // Enable auto responses when config is saved
          true  // Enable lead detection
        ]
      );
      console.log('✅ AI Config created for user:', userId);
    }

    // Return the saved configuration
    const savedConfig = {
      personality: body.personality,
      knowledgeBase: body.knowledgeBase || '',
      model: body.model,
      creativity: parseFloat(body.creativity),
      maxTokens: parseInt(body.maxTokens),
      systemPrompt: body.systemPrompt || ''
    };
    
    return NextResponse.json({ success: true, config: savedConfig });

  } catch (error) {
    console.error('❌ AI Config Error:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

// Export function to get AI config for use in other APIs
export async function getAIConfigForUser(userId) {
  try {
    const result = await query(
      'SELECT * FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      const config = result.rows[0];
      return {
        model: config.model || 'gpt-4o-mini',
        temperature: parseFloat(config.temperature) || 0.7,
        maxTokens: config.max_tokens || 500,
        systemPrompt: config.system_prompt || 'You are a helpful AI assistant.',
        autoResponseEnabled: config.auto_response_enabled || false,
        leadDetectionEnabled: config.lead_detection_enabled || true
      };
    }

    // Return default configuration if none exists
    return {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful AI assistant.',
      autoResponseEnabled: false,
      leadDetectionEnabled: true
    };

  } catch (error) {
    console.error('Error getting AI config for user:', error);
    // Return default configuration on error
    return {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful AI assistant.',
      autoResponseEnabled: false,
      leadDetectionEnabled: true
    };
  }
}
