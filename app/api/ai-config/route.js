import { NextResponse } from 'next/server';

// In-memory storage for demo (use database in production)
let aiConfig = {
  personality: 'professional',
  knowledgeBase: '',
  model: 'gpt-4o-mini',
  creativity: 0.7,
  maxTokens: 500,
  systemPrompt: ''
};

export async function GET() {
  return NextResponse.json(aiConfig);
}

export async function POST(request) {
  try {
    const body = await request.json();
    
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
    
    // Update the configuration
    aiConfig = {
      personality: body.personality,
      knowledgeBase: body.knowledgeBase || '',
      model: body.model,
      creativity: parseFloat(body.creativity),
      maxTokens: parseInt(body.maxTokens),
      systemPrompt: body.systemPrompt || ''
    };
    
    console.log('✅ AI Config Updated:', aiConfig);
    
    return NextResponse.json({ success: true, config: aiConfig });
  } catch (error) {
    console.error('❌ AI Config Error:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

// Export the config for use in chat
export function getAIConfig() {
  return aiConfig;
}
