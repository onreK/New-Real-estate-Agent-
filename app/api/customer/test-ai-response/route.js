// app/api/customer/test-ai-response/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import OpenAI from 'openai';
import { getAIConfigForUser } from '../../ai-config/route.js';
import { 
  getCustomerByClerkId 
} from '../../../../lib/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message, settings } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('🧪 Testing AI response for user:', user.id);
    console.log('📝 Test message:', message);

    // Get user's AI configuration from database
    const aiConfig = await getAIConfigForUser(user.id);
    console.log('✅ AI Configuration loaded for test:', {
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      hasCustomPrompt: !!aiConfig.systemPrompt
    });

    // Use the user's actual AI configuration
    let systemPrompt = aiConfig.systemPrompt;

    // If no custom system prompt exists, build one from the passed settings
    if (!systemPrompt || systemPrompt.trim() === 'You are a helpful AI assistant.') {
      const businessName = customer.business_name || 'My Business';
      const tone = settings?.tone || 'professional';
      const expertise = settings?.expertise || 'Real Estate';
      const specialties = settings?.specialties || 'Residential properties';
      const responseStyle = settings?.response_style || 'Helpful and detailed responses';

      systemPrompt = `You are an AI assistant representing ${businessName}. 

Communication Style:
- Tone: ${tone}
- Primary Expertise: ${expertise}
- Specialties: ${specialties}
- Response Style: ${responseStyle}

Key guidelines:
- Be ${tone} in your communication
- Provide helpful information about ${expertise}
- If you cannot answer something specific, offer to connect them with a human team member
- Keep responses concise but thorough
- Always maintain a positive, solution-oriented tone
- Sign responses appropriately for the business

${settings?.include_availability ? '- Include mentions of availability for viewings/meetings when relevant' : ''}
${settings?.ask_qualifying_questions ? '- Ask qualifying questions to better understand their needs' : ''}

Business: ${businessName}`;
    }

    console.log('🎯 Using system prompt for test:', systemPrompt.substring(0, 100) + '...');

    // Call OpenAI with the user's configuration
    const response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response generated from AI');
    }

    console.log('✅ Test AI response generated successfully');

    return NextResponse.json({
      success: true,
      response: aiResponse,
      config: {
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        systemPrompt: systemPrompt.substring(0, 200) + '...' // Truncated for response
      },
      message: 'AI response generated successfully using your custom configuration'
    });

  } catch (error) {
    console.error('❌ Error testing AI response:', error);
    return NextResponse.json({ 
      error: 'Failed to generate AI response',
      details: error.message 
    }, { status: 500 });
  }
}
