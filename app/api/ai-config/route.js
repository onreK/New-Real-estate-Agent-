import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('📖 AI Config GET request');
    
    const { userId } = auth();
    
    if (!userId) {
      console.log('❌ No authentication');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('👤 Loading config for user:', userId);

    try {
      // Import database dynamically to avoid import issues
      const { query } = await import('../../../lib/database.js');
      
      // Get AI configuration from database
      const result = await query(
        'SELECT * FROM ai_configs WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0) {
        const dbConfig = result.rows[0];
        const config = {
          personality: 'professional',
          knowledgeBase: dbConfig.system_prompt || '',
          model: dbConfig.model || 'gpt-4o-mini',
          creativity: parseFloat(dbConfig.temperature) || 0.7,
          maxTokens: dbConfig.max_tokens || 500,
          systemPrompt: dbConfig.system_prompt || ''
        };
        console.log('✅ Config loaded from database');
        return NextResponse.json(config);
      } else {
        console.log('📖 No config found, using defaults');
        const defaultConfig = {
          personality: 'professional',
          knowledgeBase: '',
          model: 'gpt-4o-mini',
          creativity: 0.7,
          maxTokens: 500,
          systemPrompt: ''
        };
        return NextResponse.json(defaultConfig);
      }

    } catch (dbError) {
      console.error('❌ Database error in GET:', dbError);
      // Return defaults if database fails
      const fallbackConfig = {
        personality: 'professional',
        knowledgeBase: '',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        systemPrompt: ''
      };
      return NextResponse.json(fallbackConfig);
    }

  } catch (error) {
    console.error('❌ GET Error:', error);
    return NextResponse.json({ 
      error: 'Failed to load configuration' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('💾 AI Config POST request');
    
    const { userId } = auth();
    
    if (!userId) {
      console.log('❌ No authentication');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Saving config for user:', userId);
    
    // Basic validation
    if (!body.personality || !body.model) {
      return NextResponse.json({ 
        error: 'Personality and model are required' 
      }, { status: 400 });
    }

    // Validate values
    const validPersonalities = ['professional', 'friendly', 'enthusiastic', 'empathetic', 'expert'];
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    
    if (!validPersonalities.includes(body.personality)) {
      return NextResponse.json({ 
        error: 'Invalid personality selected' 
      }, { status: 400 });
    }
    
    if (!validModels.includes(body.model)) {
      return NextResponse.json({ 
        error: 'Invalid model selected' 
      }, { status: 400 });
    }

    // Parse numeric values safely
    let creativity = 0.7;
    if (body.creativity !== undefined) {
      creativity = parseFloat(body.creativity);
      if (isNaN(creativity) || creativity < 0 || creativity > 1) {
        creativity = 0.7;
      }
    }

    let maxTokens = 500;
    if (body.maxTokens !== undefined) {
      maxTokens = parseInt(body.maxTokens);
      if (isNaN(maxTokens) || maxTokens < 1) {
        maxTokens = 500;
      }
    }

    // Build system prompt
    let systemPrompt = '';
    
    switch (body.personality) {
      case 'professional':
        systemPrompt = 'You are a professional AI assistant. Be direct, helpful, and maintain a business-appropriate tone.';
        break;
      case 'friendly':
        systemPrompt = 'You are a friendly AI assistant. Be warm, conversational, and approachable.';
        break;
      case 'enthusiastic':
        systemPrompt = 'You are an enthusiastic AI assistant. Be energetic and positive.';
        break;
      case 'empathetic':
        systemPrompt = 'You are an empathetic AI assistant. Be understanding and supportive.';
        break;
      case 'expert':
        systemPrompt = 'You are an expert AI assistant. Be technical and authoritative.';
        break;
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }

    // Add knowledge base
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      systemPrompt += '\n\nBusiness Information:\n' + body.knowledgeBase.trim();
    }

    // Add custom prompt
    if (body.systemPrompt && body.systemPrompt.trim()) {
      systemPrompt += '\n\nAdditional Instructions:\n' + body.systemPrompt.trim();
    }

    try {
      console.log('💾 Saving to database...');
      
      // Import database dynamically
      const { query } = await import('../../../lib/database.js');
      
      // Check if config exists
      const existingResult = await query(
        'SELECT id FROM ai_configs WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE ai_configs 
           SET model = $1, temperature = $2, max_tokens = $3, system_prompt = $4, 
               auto_response_enabled = true, lead_detection_enabled = true, 
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $5`,
          [body.model, creativity, maxTokens, systemPrompt, userId]
        );
        console.log('✅ Updated existing config');
      } else {
        // Create new
        await query(
          `INSERT INTO ai_configs (user_id, model, temperature, max_tokens, system_prompt, 
                                   auto_response_enabled, lead_detection_enabled)
           VALUES ($1, $2, $3, $4, $5, true, true)`,
          [userId, body.model, creativity, maxTokens, systemPrompt]
        );
        console.log('✅ Created new config');
      }

      // Return success
      const savedConfig = {
        personality: body.personality,
        knowledgeBase: body.knowledgeBase || '',
        model: body.model,
        creativity: creativity,
        maxTokens: maxTokens,
        systemPrompt: body.systemPrompt || ''
      };
      
      console.log('✅ Save successful');
      return NextResponse.json({ 
        success: true, 
        message: 'Configuration saved successfully!',
        config: savedConfig 
      });

    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      console.error('Error details:', dbError.message, dbError.code);
      
      return NextResponse.json({ 
        error: 'Failed to save to database',
        details: `Database error: ${dbError.message}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ POST Error:', error);
    return NextResponse.json({ 
      error: 'Failed to save configuration',
      details: error.message 
    }, { status: 500 });
  }
}

// Export function for other APIs
export async function getAIConfigForUser(userId) {
  try {
    if (!userId) {
      return {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
        systemPrompt: 'You are a helpful AI assistant.',
        autoResponseEnabled: false,
        leadDetectionEnabled: true
      };
    }

    const { query } = await import('../../../lib/database.js');
    
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

    return {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful AI assistant.',
      autoResponseEnabled: false,
      leadDetectionEnabled: true
    };

  } catch (error) {
    console.error('Error in getAIConfigForUser:', error);
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
