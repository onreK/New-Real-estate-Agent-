import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// In-memory storage for AI config (use database in production)
// In a real app, this would be stored in a database per user
const aiConfigs = new Map();

// Default configuration
const defaultConfig = {
  personality: 'professional',
  knowledgeBase: 'always ask for the customer\'s name, and require email or phone number from the customer',
  model: 'gpt-4o-mini',
  creativity: 0.7,
  maxTokens: 500,
  systemPrompt: ''
};

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user-specific config or return default
    const userConfig = aiConfigs.get(userId) || defaultConfig;
    
    console.log('✅ AI Config loaded for user:', userId);
    return NextResponse.json(userConfig);
    
  } catch (error) {
    console.error('❌ Error loading AI config:', error);
    return NextResponse.json(defaultConfig); // Return default on error
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
    
    // Validation checks
    if (!validPersonalities.includes(body.personality)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid personality. Must be one of: ' + validPersonalities.join(', ') 
      }, { status: 400 });
    }
    
    if (!validModels.includes(body.model)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid model. Must be one of: ' + validModels.join(', ') 
      }, { status: 400 });
    }
    
    if (body.creativity < 0 || body.creativity > 1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Creativity must be between 0 and 1' 
      }, { status: 400 });
    }

    if (![150, 300, 500, 1000].includes(body.maxTokens)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid maxTokens. Must be 150, 300, 500, or 1000' 
      }, { status: 400 });
    }
    
    // Sanitize and structure the configuration
    const aiConfig = {
      personality: body.personality,
      knowledgeBase: (body.knowledgeBase || '').trim(),
      model: body.model,
      creativity: parseFloat(body.creativity),
      maxTokens: parseInt(body.maxTokens),
      systemPrompt: (body.systemPrompt || '').trim(),
      updatedAt: new Date().toISOString(),
      userId: userId
    };
    
    // Store the configuration (in production, save to database)
    aiConfigs.set(userId, aiConfig);
    
    console.log('✅ AI Config saved successfully for user:', userId);
    console.log('Config details:', {
      personality: aiConfig.personality,
      model: aiConfig.model,
      creativity: aiConfig.creativity,
      maxTokens: aiConfig.maxTokens,
      knowledgeBaseLength: aiConfig.knowledgeBase.length,
      hasSystemPrompt: !!aiConfig.systemPrompt
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      config: aiConfig 
    });
    
  } catch (error) {
    console.error('❌ Error saving AI config:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save configuration: ' + error.message 
    }, { status: 500 });
  }
}

// Export function to get AI config for use in chat API
export function getAIConfigForUser(userId) {
  return aiConfigs.get(userId) || defaultConfig;
}

// Export function to get current config (for chat API)
export function getCurrentAIConfig(userId = null) {
  if (userId) {
    return aiConfigs.get(userId) || defaultConfig;
  }
  
  // If no userId provided, return default (fallback)
  return defaultConfig;
}
