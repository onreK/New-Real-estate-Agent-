// app/api/customer/test-ai-response/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import OpenAI from 'openai';
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

    // Build AI personality prompt based on settings
    const businessName = customer.business_name || 'My Business';
    const tone = settings?.tone || 'professional';
    const expertise = settings?.expertise || 'Real Estate';
    const specialties = settings?.specialties || 'Residential properties';
    const responseStyle = settings?.response_style || 'Helpful and detailed responses';

    const systemPrompt = `You are an AI assistant representing ${businessName}. 

Communication Style:
- Tone: ${tone}
- Primary Expertise: ${expertise}
- Specialties: ${specialties}
- Response Style: ${responseStyle}

Key guidelines:
- Be ${tone} in your email communication
- Provide helpful information about ${expertise}
- If you cannot answer something specific, offer to connect them with a human team member
- Keep responses concise but thorough
- Always maintain a positive, solution-oriented tone
- Sign emails appropriately for the business

${settings?.include_availability ? '- Include mentions of availability for viewings/meetings when relevant' : ''}
${settings?.ask_qualifying_questions ? '- Ask qualifying questions about budget, timeline, and preferences' : ''}

Business: ${businessName}
Communication method: Email`;

    // Generate AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiText = response.choices[0]?.message?.content;
    
    if (!aiText) {
      throw new Error('No AI response generated');
    }

    // Check for hot lead keywords
    const hotLeadKeywords = settings?.hot_lead_keywords || ['urgent', 'asap', 'immediately', 'budget', 'ready'];
    const messageText = message.toLowerCase();
    const matchedKeywords = hotLeadKeywords.filter(keyword => 
      messageText.includes(keyword.toLowerCase())
    );

    console.log('✅ Test AI response generated for customer:', customer.business_name);
    
    return NextResponse.json({
      success: true,
      response: aiText,
      hotLeadDetected: matchedKeywords.length > 0,
      matchedKeywords: matchedKeywords,
      settings: {
        tone: tone,
        business: businessName,
        expertise: expertise
      }
    });

  } catch (error) {
    console.error('❌ Error generating test AI response:', error);
    return NextResponse.json({ 
      error: 'Failed to generate test AI response',
      details: error.message 
    }, { status: 500 });
  }
}
