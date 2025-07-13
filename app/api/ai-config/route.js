import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// Import database with error handling
let query = null;
let dbAvailable = false;

try {
  const database = await import('../../../lib/database.js');
  query = database.query;
  dbAvailable = true;
  console.log('✅ Database connection available for AI config');
} catch (error) {
  console.error('❌ Database not available for AI config:', error.message);
  dbAvailable = false;
}

export async function GET() {
  try {
    console.log('📖 AI Config GET request received');
    
    // Check authentication
    let userId = null;
    try {
      const authResult = auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: 'Please make sure you are signed in'
      }, { status: 401 });
    }
    
    if (!userId) {
      console.log('❌ No user authentication');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access AI configuration'
      }, { status: 401 });
    }

    console.log('👤 Loading AI config for user:', userId);

    // Check database availability
    if (!dbAvailable) {
      console.log('⚠️ Database not available, returning default config');
      return NextResponse.json({
        personality: 'professional',
        knowledgeBase: '',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        systemPrompt: '',
        _fallbackMode: true,
        _message: 'Using default configuration - database not available'
      });
    }

    try {
      // Get AI configuration from database
      const result = await query(
        'SELECT * FROM ai_configs WHERE user_id = $1',
        [userId]
      );

      let config;
      if (result.rows.length > 0) {
        const dbConfig = result.rows[0];
        config = {
          personality: 'professional', // Will be determined from system_prompt
          knowledgeBase: dbConfig.system_prompt || '',
          model: dbConfig.model || 'gpt-4o-mini',
          creativity: parseFloat(dbConfig.temperature) || 0.7,
          maxTokens: dbConfig.max_tokens || 500,
          systemPrompt: dbConfig.system_prompt || ''
        };
        console.log('✅ Loaded config from database for user:', userId);
      } else {
        // Default configuration for new users
        config = {
          personality: 'professional',
          knowledgeBase: '',
          model: 'gpt-4o-mini',
          creativity: 0.7,
          maxTokens: 500,
          systemPrompt: ''
        };
        console.log('📖 No saved config found, using defaults for user:', userId);
      }

      return NextResponse.json(config);

    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      return NextResponse.json({
        personality: 'professional',
        knowledgeBase: '',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        systemPrompt: '',
        _fallbackMode: true,
        _error: 'Database query failed, using defaults'
      });
    }

  } catch (error) {
    console.error('❌ GET AI Config Error:', error);
    return NextResponse.json({ 
      error: 'Failed to load configuration',
      details: error.message,
      fallback: {
        personality: 'professional',
        knowledgeBase: '',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        systemPrompt: ''
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('💾 AI Config POST request received');
    
    // Check authentication
    let userId = null;
    try {
      const authResult = auth();
      userId = authResult?.userId;
    } catch (authError) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: 'Please make sure you are signed in'
      }, { status: 401 });
    }
    
    if (!userId) {
      console.log('❌ No user authentication');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to save AI configuration'
      }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Saving AI config for user:', userId, {
      personality: body.personality,
      knowledgeBase: body.knowledgeBase ? `${body.knowledgeBase.length} chars` : 'empty',
      model: body.model,
      creativity: body.creativity,
      maxTokens: body.maxTokens
    });
    
    // Validate the configuration
    const validPersonalities = ['professional', 'friendly', 'enthusiastic', 'empathetic', 'expert'];
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    
    if (!body.personality || !validPersonalities.includes(body.personality)) {
      console.log('❌ Invalid personality:', body.personality);
      return NextResponse.json({ 
        error: 'Invalid personality selected',
        validOptions: validPersonalities
      }, { status: 400 });
    }
    
    if (!body.model || !validModels.includes(body.model)) {
      console.log('❌ Invalid model:', body.model);
      return NextResponse.json({ 
        error: 'Invalid AI model selected',
        validOptions: validModels
      }, { status: 400 });
    }
    
    // Validate and parse creativity
    let creativity = 0.7;
    if (body.creativity !== undefined && body.creativity !== null) {
      creativity = typeof body.creativity === 'string' ? parseFloat(body.creativity) : body.creativity;
      if (isNaN(creativity) || creativity < 0 || creativity > 1) {
        console.log('❌ Invalid creativity:', body.creativity);
        return NextResponse.json({ 
          error: 'Creativity must be a number between 0 and 1'
        }, { status: 400 });
      }
    }

    // Validate and parse maxTokens
    let maxTokens = 500;
    if (body.maxTokens !== undefined && body.maxTokens !== null) {
      maxTokens = typeof body.maxTokens === 'string' ? parseInt(body.maxTokens) : body.maxTokens;
      if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 4000) {
        console.log('❌ Invalid maxTokens:', body.maxTokens);
        return NextResponse.json({ 
          error: 'Max tokens must be between 1 and 4000'
        }, { status: 400 });
      }
    }

    // Check database availability
    if (!dbAvailable) {
      console.log('❌ Database not available for saving');
      return NextResponse.json({ 
        error: 'Database not available',
        message: 'Cannot save configuration - database connection failed',
        suggestion: 'Please check your database connection and try again'
      }, { status: 503 });
    }

    // Build the system prompt
    let systemPrompt = '';
    
    // Add personality-based prompt
    const personalityPrompts = {
      professional: 'You are a professional AI assistant. Be direct, helpful, and maintain a business-appropriate tone.',
      friendly: 'You are a friendly AI assistant. Be warm, conversational, and approachable while being helpful.',
      enthusiastic: 'You are an enthusiastic AI assistant. Be energetic, positive, and excited to help customers.',
      empathetic: 'You are an empathetic AI assistant. Be understanding, compassionate, and supportive in your responses.',
      expert: 'You are an expert AI assistant. Be technical, detailed, and authoritative in your responses.'
    };
    
    systemPrompt = personalityPrompts[body.personality] || personalityPrompts.professional;

    // Add knowledge base content
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      systemPrompt += '\n\nBusiness Information:\n' + body.knowledgeBase.trim();
    }

    // Add custom system prompt if provided
    if (body.systemPrompt && body.systemPrompt.trim()) {
      systemPrompt += '\n\nAdditional Instructions:\n' + body.systemPrompt.trim();
    }

    try {
      console.log('💾 Attempting to save to database...');
      
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
            true,
            true,
            userId
          ]
        );
        console.log('✅ Updated existing AI config for user:', userId);
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
            true,
            true
          ]
        );
        console.log('✅ Created new AI config for user:', userId);
      }

      // Return success response
      const savedConfig = {
        personality: body.personality,
        knowledgeBase: body.knowledgeBase || '',
        model: body.model,
        creativity: creativity,
        maxTokens: maxTokens,
        systemPrompt: body.systemPrompt || ''
      };
      
      console.log('✅ AI config saved successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Configuration saved successfully!',
        config: savedConfig 
      });

    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      return NextResponse.json({ 
        error: 'Database error while saving configuration',
        details: dbError.message,
        suggestion: 'Please try again. If the problem persists, check your database connection.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ POST AI Config Error:', error);
    return NextResponse.json({ 
      error: 'Failed to save configuration',
      details: error.message
    }, { status: 500 });
  }
}

// Export function for other APIs to use
export async function getAIConfigForUser(userId) {
  try {
    console.log('🔍 getAIConfigForUser called for:', userId);
    
    if (!userId || !dbAvailable) {
      console.log('🔍 Returning default config (no user ID or DB)');
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
      console.log('✅ Found AI config in database');
      return {
        model: config.model || 'gpt-4o-mini',
        temperature: parseFloat(config.temperature) || 0.7,
        maxTokens: config.max_tokens || 500,
        systemPrompt: config.system_prompt || 'You are a helpful AI assistant.',
        autoResponseEnabled: config.auto_response_enabled || false,
        leadDetectionEnabled: config.lead_detection_enabled || true
      };
    }

    console.log('📖 No config found, using defaults');
    return {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful AI assistant.',
      autoResponseEnabled: false,
      leadDetectionEnabled: true
    };

  } catch (error) {
    console.error('❌ Error in getAIConfigForUser:', error);
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
