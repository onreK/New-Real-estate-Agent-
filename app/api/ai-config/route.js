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

    // Get AI configuration from database using CORRECT column names
    const result = await query(
      'SELECT * FROM ai_configs WHERE user_id = $1',
      [userId]
    );

    console.log('📊 Query result:', { rowCount: result.rows.length });

    let config;
    if (result.rows.length > 0) {
      const dbConfig = result.rows[0];
      console.log('📄 Database config keys:', Object.keys(dbConfig));
      
      // Map database columns to frontend format using CORRECT column names
      config = {
        personality: dbConfig.personality || 'professional',
        knowledgeBase: dbConfig.knowledge_base || '',  // ✅ CORRECT: knowledge_base
        model: dbConfig.model || 'gpt-4o-mini',
        creativity: parseFloat(dbConfig.creativity) || 0.7,  // ✅ CORRECT: creativity
        maxTokens: parseInt(dbConfig.response_length) || 500,  // ✅ CORRECT: response_length
        systemPrompt: dbConfig.business_info || ''  // ✅ CORRECT: business_info
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

    // Build system prompt from knowledgeBase
    let businessInfo = 'You are a professional AI assistant.';
    if (body.knowledgeBase && body.knowledgeBase.trim()) {
      businessInfo = body.knowledgeBase.trim();
    }

    console.log('💾 Saving config for user:', userId);
    console.log('📊 Values to save:', {
      personality: body.personality,
      model: body.model,
      creativity,
      maxTokens,
      knowledgeBaseLength: body.knowledgeBase?.length || 0,
      businessInfoLength: businessInfo.length
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
        // ✅ CORRECT column names: personality, knowledge_base, model, creativity, response_length, business_info
        await query(
          `UPDATE ai_configs 
           SET personality = $1, knowledge_base = $2, model = $3, creativity = $4, 
               response_length = $5, business_info = $6, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $7`,
          [body.personality, body.knowledgeBase || '', body.model, creativity, maxTokens, businessInfo, userId]
        );
        console.log('✅ Update completed');
      } else {
        console.log('➕ Creating new config...');
        // ✅ FIXED: Use explicit column names to avoid ordering issues
        await query(
          `INSERT INTO ai_configs (
             user_id, personality, business_info, model, creativity, 
             response_length, knowledge_base
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,                           // user_id
            body.personality,                // personality
            businessInfo,                    // business_info
            body.model,                      // model
            creativity,                      // creativity
            maxTokens,                       // response_length
            body.knowledgeBase || ''         // knowledge_base
          ]
        );
        console.log('✅ Insert completed');
      }

      const savedConfig = {
        personality: body.personality,
        knowledgeBase: body.knowledgeBase || '',
        model: body.model,
        creativity,
        maxTokens,
        systemPrompt: businessInfo
      };
      
      console.log('🎉 Save successful');
      return NextResponse.json({ 
        success: true, 
        message: 'Configuration saved successfully! 🎉',
        config: savedConfig 
      });

    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      console.error('DB Error code:', dbError.code);
      console.error('DB Error detail:', dbError.detail);
      console.error('DB Error constraint:', dbError.constraint);
      console.error('DB Error stack:', dbError.stack);
      
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError.message,
        code: dbError.code,
        constraint: dbError.constraint
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
        temperature: parseFloat(config.creativity) || 0.7,  // ✅ CORRECT: creativity
        maxTokens: parseInt(config.response_length) || 500,  // ✅ CORRECT: response_length
        systemPrompt: config.business_info || 'You are a helpful AI assistant.',  // ✅ CORRECT: business_info
        autoResponseEnabled: config.enable_hot_lead_alerts || false,
        leadDetectionEnabled: true
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
