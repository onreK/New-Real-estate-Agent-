import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// Import database with proper error handling
let query = null;
let dbAvailable = false;

try {
  const database = await import('../../../lib/database.js');
  query = database.query;
  dbAvailable = true;
  console.log('✅ Database connected for AI config');
} catch (error) {
  console.log('⚠️ Database not available for AI config, using fallback:', error.message);
  dbAvailable = false;
}

// Fallback in-memory storage when database is not available
let fallbackConfig = {
  personality: 'professional',
  knowledgeBase: '',
  model: 'gpt-4o-mini',
  creativity: 0.7,
  maxTokens: 500,
  systemPrompt: ''
};

export async function GET() {
  try {
    console.log('📖 AI Config GET request received');
    
    // Try to get user authentication
    let userId = null;
    try {
      const authResult = auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.log('⚠️ Auth not available, using fallback mode:', authError.message);
    }
    
    console.log('👤 User ID:', userId || 'anonymous');

    if (!dbAvailable || !userId) {
      console.log('📖 Using fallback config (no DB or auth)');
      return NextResponse.json(fallbackConfig);
    }

    console.log('📖 Getting AI config from database for user:', userId);

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
      console.log('✅ Loaded config from database');
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
      console.log('📖 Using default config (no saved config found)');
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('❌ Error getting AI config:', error);
    console.log('📖 Falling back to default config due to error');
    return NextResponse.json(fallbackConfig);
  }
}

export async function POST(request) {
  try {
    console.log('💾 AI Config POST request received');
    
    // Try to get user authentication
    let userId = null;
    try {
      const authResult = auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.log('⚠️ Auth not available:', authError.message);
    }
    
    if (!userId) {
      console.log('❌ No user authentication available');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Saving AI config for user:', userId, {
      personality: body.personality,
      knowledgeBase: body.knowledgeBase ? `${body.knowledgeBase.length} chars` : 'empty',
      model: body.model,
      creativity: body.creativity,
      maxTokens: body.maxTokens
    });
    
    // Validate the configuration with better error handling
    const validPersonalities = ['professional', 'friendly', 'enthusiastic', 'empathetic', 'expert'];
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    
    if (!body.personality || !validPersonalities.includes(body.personality)) {
      console.log('❌ Invalid personality:', body.personality);
      return NextResponse.json({ error: 'Invalid personality' }, { status: 400 });
    }
    
    if (!body.model || !validModels.includes(body.model)) {
      console.log('❌ Invalid model:', body.model);
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }
    
    // Validate creativity with proper type checking
    let creativity = 0.7;
    if (body.creativity !== undefined && body.creativity !== null) {
      creativity = typeof body.creativity === 'string' ? parseFloat(body.creativity) : body.creativity;
      if (isNaN(creativity) || creativity < 0 || creativity > 1) {
        console.log('❌ Invalid creativity:', body.creativity);
        return NextResponse.json({ error: 'Creativity must be between 0 and 1' }, { status: 400 });
      }
    }

    // Validate maxTokens with proper type checking
    let maxTokens = 500;
    if (body.maxTokens !== undefined && body.maxTokens !== null) {
      maxTokens = typeof body.maxTokens === 'string' ? parseInt(body.maxTokens) : body.maxTokens;
      if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 4000) {
        console.log('❌ Invalid maxTokens:', body.maxTokens);
        return NextResponse.json({ error: 'Max tokens must be between 1 and 4000' }, { status: 400 });
      }
    }

    // Handle database fallback
    if (!dbAvailable) {
      console.log('💾 Database not available, updating fallback config');
      fallbackConfig = {
        personality: body.personality,
        knowledgeBase: body.knowledgeBase || '',
        model: body.model,
        creativity: creativity,
        maxTokens: maxTokens,
        systemPrompt: body.systemPrompt || ''
      };
      return NextResponse.json({ 
        success: true, 
        message: 'Configuration saved (fallback mode)',
        config: fallbackConfig 
      });
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
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }

    // Add knowledge base content
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      systemPrompt += '\n\nCustom Instructions:\n' + body.knowledgeBase.trim();
    }

    // Add custom system prompt if provided
    if (body.systemPrompt && body.systemPrompt.trim()) {
      systemPrompt += '\n\nAdditional Instructions:\n' + body.systemPrompt.trim();
    }

    try {
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
            creativity,
            maxTokens,
            systemPrompt,
            true, // Enable auto responses when config is saved
            true, // Enable lead detection
            userId
          ]
        );
        console.log('✅ AI Config updated in database for user:', userId);
      } else {
        // Create new configuration
        await query(
          `INSERT INTO ai_configs (user_id, model, temperature, max_tokens, system_prompt, auto_response_enabled, lead_detection_enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            body.model,
            creativity,
            maxTokens,
            systemPrompt,
            true, // Enable auto responses when config is saved
            true  // Enable lead detection
          ]
        );
        console.log('✅ AI Config created in database for user:', userId);
      }
    } catch (dbError) {
      console.error('❌ Database error saving AI config:', dbError);
      return NextResponse.json({ 
        error: 'Database error while saving configuration',
        details: dbError.message 
      }, { status: 500 });
    }

    // Return the saved configuration
    const savedConfig = {
      personality: body.personality,
      knowledgeBase: body.knowledgeBase || '',
      model: body.model,
      creativity: creativity,
      maxTokens: maxTokens,
      systemPrompt: body.systemPrompt || ''
    };
    
    console.log('✅ AI config saved successfully for user:', userId);
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully!',
      config: savedConfig 
    });

  } catch (error) {
    console.error('❌ AI Config POST Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      error: 'Failed to save configuration',
      details: error.message 
    }, { status: 500 });
  }
}

// Export function to get AI config for use in other APIs
export async function getAIConfigForUser(userId) {
  try {
    console.log('🔍 getAIConfigForUser called for user:', userId);
    
    if (!dbAvailable || !userId) {
      console.log('🔍 Returning fallback config (no DB or user ID)');
      return {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        systemPrompt: 'You are a helpful AI assistant.',
        autoResponseEnabled: false,
        leadDetectionEnabled: true
      };
    }

    const result = await query(
      'SELECT * FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      const config = result.rows[0];
      console.log('✅ AI config found in database for user:', userId);
      return {
        model: config.model || 'gpt-4o-mini',
        temperature: parseFloat(config.temperature) || 0.7,
        maxTokens: config.max_tokens || 500,
        systemPrompt: config.system_prompt || 'You are a helpful AI assistant.',
        autoResponseEnabled: config.auto_response_enabled || false,
        leadDetectionEnabled: config.lead_detection_enabled || true
      };
    }

    console.log('📖 No AI config found, returning default for user:', userId);
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
    console.error('❌ Error getting AI config for user:', userId, error);
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
