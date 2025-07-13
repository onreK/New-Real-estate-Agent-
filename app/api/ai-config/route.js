import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '../../../lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('📖 AI Config GET request received');
    
    const { userId } = auth();
    console.log('🔐 Auth result:', { userId: userId || 'none' });
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📖 Querying database for user:', userId);

    // Test database connection first
    try {
      await query('SELECT 1 as test');
      console.log('✅ Database connection test passed');
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if ai_configs table exists
    try {
      await query('SELECT COUNT(*) FROM ai_configs');
      console.log('✅ ai_configs table exists and accessible');
    } catch (tableError) {
      console.error('❌ ai_configs table issue:', tableError);
      return NextResponse.json({ error: 'ai_configs table not accessible' }, { status: 500 });
    }

    // Get AI configuration from database
    const result = await query(
      'SELECT * FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    console.log('📊 Query result:', { rowCount: result.rows.length });

    let config;
    if (result.rows.length > 0) {
      const dbConfig = result.rows[0];
      console.log('📄 Database config keys:', Object.keys(dbConfig));
      
      config = {
        personality: 'professional',
        knowledgeBase: dbConfig.system_prompt || '',
        model: dbConfig.model || 'gpt-4o-mini',
        creativity: parseFloat(dbConfig.temperature) || 0.7,
        maxTokens: dbConfig.max_tokens || 500,
        systemPrompt: dbConfig.system_prompt || ''
      };
      console.log('✅ Config loaded from database');
    } else {
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
    console.error('❌ GET Error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to get configuration',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('💾 AI Config POST request received');
    
    const { userId } = auth();
    console.log('🔐 Auth result:', { userId: userId || 'none' });
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Request body:', {
      personality: body.personality,
      model: body.model,
      knowledgeBaseLength: body.knowledgeBase?.length || 0,
      creativity: body.creativity,
      maxTokens: body.maxTokens
    });
    
    // Validate required fields
    if (!body.personality || !body.model) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Personality and model are required' 
      }, { status: 400 });
    }

    // Parse values safely
    const creativity = parseFloat(body.creativity) || 0.7;
    const maxTokens = parseInt(body.maxTokens) || 500;

    // Build system prompt
    let systemPrompt = 'You are a professional AI assistant.';
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      systemPrompt += '\n\nBusiness Information:\n' + body.knowledgeBase.trim();
    }

    console.log('💾 Saving config for user:', userId);
    console.log('📊 Values to save:', {
      model: body.model,
      creativity,
      maxTokens,
      systemPromptLength: systemPrompt.length
    });

    try {
      // Test database connection
      await query('SELECT 1 as test');
      console.log('✅ Database connection test passed');

      // Check if config exists
      console.log('🔍 Checking for existing config...');
      const existingResult = await query(
        'SELECT id FROM ai_configs WHERE user_id = $1',
        [userId]
      );

      console.log('📊 Existing check result:', { rowCount: existingResult.rows.length });

      if (existingResult.rows.length > 0) {
        console.log('🔄 Updating existing config...');
        await query(
          `UPDATE ai_configs 
           SET model = $1, temperature = $2, max_tokens = $3, system_prompt = $4, 
               auto_response_enabled = true, lead_detection_enabled = true, 
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $5`,
          [body.model, creativity, maxTokens, systemPrompt, userId]
        );
        console.log('✅ Update completed');
      } else {
        console.log('➕ Creating new config...');
        await query(
          `INSERT INTO ai_configs (user_id, model, temperature, max_tokens, system_prompt, 
                                   auto_response_enabled, lead_detection_enabled)
           VALUES ($1, $2, $3, $4, $5, true, true)`,
          [userId, body.model, creativity, maxTokens, systemPrompt]
        );
        console.log('✅ Insert completed');
      }

      const savedConfig = {
        personality: body.personality,
        knowledgeBase: body.knowledgeBase || '',
        model: body.model,
        creativity,
        maxTokens,
        systemPrompt: body.systemPrompt || ''
      };
      
      console.log('🎉 Save successful');
      return NextResponse.json({ 
        success: true, 
        message: 'Configuration saved successfully!',
        config: savedConfig 
      });

    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      console.error('DB Error code:', dbError.code);
      console.error('DB Error detail:', dbError.detail);
      console.error('DB Error stack:', dbError.stack);
      
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError.message,
        code: dbError.code
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ POST Error:', error);
    console.error('Error stack:', error.stack);
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
