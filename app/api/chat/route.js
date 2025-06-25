// app/api/chat/route.js
import { NextResponse } from 'next/server';

// In-memory storage for businesses (same as businesses API)
let businesses = [
  {
    id: 'business_test_1',
    businessName: 'Test Real Estate Co',
    industry: 'real-estate',
    businessDescription: 'Professional real estate services you can trust in the test area.',
    targetAudience: 'Home buyers and sellers',
    aiFeatures: ['chatbot', 'voice', 'lead-scoring'],
    // New AI configuration fields
    aiPersonality: 'professional', // professional, friendly, casual, expert
    aiTone: 'helpful', // helpful, sales-focused, consultative, educational
    customInstructions: '',
    knowledgeBase: '',
    openaiApiKey: process.env.OPENAI_API_KEY // Will use default key if not set
  }
];

export async function POST(request) {
  try {
    const { message, businessId, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get business information
    const business = businesses.find(b => b.id === businessId) || businesses[0];
    
    // Check if OpenAI is configured
    const apiKey = business.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('No OpenAI API key found, using fallback responses');
      const fallbackResponse = getFallbackResponse(message, business);
      
      return NextResponse.json({
        response: fallbackResponse,
        shouldCaptureLead: checkShouldCaptureLead(message, fallbackResponse),
        timestamp: new Date().toISOString(),
        aiProvider: 'fallback'
      });
    }

    // Build system prompt based on business information
    const systemPrompt = createSystemPrompt(business);

    // Format conversation history for AI
    const formattedHistory = conversationHistory?.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })) || [];

    // Call OpenAI API
    const aiResponse = await callOpenAI(systemPrompt, formattedHistory, message, apiKey);

    // Check if we should capture lead information
    const shouldCaptureLead = checkShouldCaptureLead(message, aiResponse);

    return NextResponse.json({
      response: aiResponse,
      shouldCaptureLead,
      timestamp: new Date().toISOString(),
      aiProvider: 'openai'
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Fallback to simulated response if OpenAI fails
    const business = businesses[0];
    const fallbackResponse = getFallbackResponse(
      request.message || 'Hello', 
      business
    );
    
    return NextResponse.json({
      response: fallbackResponse + " (Note: AI service temporarily unavailable, using backup response)",
      shouldCaptureLead: false,
      timestamp: new Date().toISOString(),
      aiProvider: 'fallback'
    });
  }
}

function createSystemPrompt(business) {
  const industryContext = getIndustryContext(business.industry);
  const personalityTone = getPersonalityTone(business.aiPersonality, business.aiTone);
  
  return `You are an AI assistant for ${business.businessName}, a ${business.industry} business.

BUSINESS CONTEXT:
- Business: ${business.businessName}
- Industry: ${business.industry}
- Description: ${business.businessDescription}
- Target Audience: ${business.targetAudience}

PERSONALITY & TONE:
${personalityTone}

CUSTOM KNOWLEDGE:
${business.knowledgeBase || 'No additional knowledge provided.'}

CUSTOM INSTRUCTIONS:
${business.customInstructions || 'Follow standard helpful assistant guidelines.'}

YOUR ROLE:
- Answer questions about ${business.businessName} and ${business.industry} services
- Help potential customers understand how the business can help them
- Qualify leads by understanding their needs
- Guide conversations toward scheduling consultations or next steps
- Capture interest and encourage engagement

INDUSTRY-SPECIFIC GUIDANCE:
${industryContext}

CONVERSATION RULES:
1. Keep responses under 100 words when possible
2. Ask follow-up questions to understand customer needs
3. Be specific about services offered
4. If you don't know something specific about the business, say so honestly
5. Always aim to be helpful and move the conversation forward
6. Suggest speaking with a team member for complex questions
7. Don't make up prices or specific policies - direct them to contact the business

LEAD QUALIFICATION:
- Pay attention to buying signals (timeline, budget, specific needs)
- Note high-intent phrases like "looking for", "need help with", "ready to"
- If someone shows strong interest, suggest they leave contact information

Remember: You represent ${business.businessName} and should always reflect their professionalism and expertise.`;
}

function getPersonalityTone(personality, tone) {
  const personalities = {
    professional: "Maintain a professional, polished demeanor. Use formal language and industry terminology appropriately.",
    friendly: "Be warm, approachable, and conversational. Use casual language while remaining helpful.",
    casual: "Keep things relaxed and informal. Be personable and use everyday language.",
    expert: "Demonstrate deep knowledge and authority. Provide detailed, technical insights when appropriate."
  };

  const tones = {
    helpful: "Focus on being genuinely helpful and solving problems. Put the customer's needs first.",
    'sales-focused': "Guide conversations toward business value and next steps. Be persuasive but not pushy.",
    consultative: "Ask thoughtful questions to understand needs before providing solutions.",
    educational: "Teach and inform. Help customers understand options and make informed decisions."
  };

  return `${personalities[personality] || personalities.professional}\n${tones[tone] || tones.helpful}`;
}

function getIndustryContext(industry) {
  const contexts = {
    'real-estate': `
- Help with buying, selling, and renting properties
- Provide market insights and property valuations
- Guide first-time homebuyers through the process
- Explain financing options and requirements
- Discuss local market conditions and neighborhoods
- Common questions: pricing, availability, viewing schedules, financing`,
    
    'healthcare': `
- Provide general health information (not medical advice)
- Help with appointment scheduling and services
- Explain procedures and treatments available
- Guide patients through insurance and billing questions
- Emphasize the importance of consulting healthcare professionals`,
    
    'legal-services': `
- Provide general legal information (not legal advice)
- Help identify what type of legal services are needed
- Explain the legal process for common issues
- Guide potential clients on when they need an attorney
- Emphasize confidentiality and professional consultation`,
    
    'financial-services': `
- Provide general financial education and guidance
- Help with understanding financial products and services
- Guide discussions about financial planning and goals
- Explain investment options and risk factors
- Emphasize the importance of professional financial advice`,
    
    'default': `
- Focus on understanding customer needs and pain points
- Highlight the unique value proposition of the business
- Guide conversations toward how the business can help
- Encourage engagement and next steps`
  };

  return contexts[industry] || contexts['default'];
}

async function callOpenAI(systemPrompt, conversationHistory, newMessage, apiKey) {
  try {
    console.log('🤖 Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // or 'gpt-3.5-turbo' for lower cost
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: newMessage }
        ],
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', response.status, errorData);
      throw new Error(`OpenAI API Error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;
    
    console.log('✅ OpenAI Response received');
    return aiMessage;

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

function getFallbackResponse(message, business) {
  const lowerMessage = message.toLowerCase();
  
  // Context-aware fallback responses
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return `I'd be happy to discuss pricing for ${business.businessName}'s services. Since pricing varies based on your specific needs, I'd recommend speaking with our team for a personalized quote. Would you like me to arrange that?`;
  }
  
  if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
    return `I'd love to help you schedule an appointment with ${business.businessName}! Let me get your contact information so we can find a time that works best for you.`;
  }
  
  if (lowerMessage.includes('services') || lowerMessage.includes('help')) {
    return `${business.businessName} specializes in ${business.industry} services. We'd be happy to discuss how we can help you specifically. What brings you here today?`;
  }
  
  // Default responses
  const defaultResponses = [
    `Thank you for your interest in ${business.businessName}! I'd be happy to help you with that. Could you tell me a bit more about what you're looking for?`,
    `That's a great question! Based on what you've shared, ${business.businessName} can definitely help you explore your options. What's most important to you in this process?`,
    `I understand what you're looking for. Let me connect you with the right information about ${business.businessName}'s services.`,
    `Absolutely! We specialize in exactly that type of situation. Would you like to schedule a quick consultation to discuss your specific needs?`
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function checkShouldCaptureLead(userMessage, aiResponse) {
  // Logic to determine when to capture lead information
  const leadTriggers = [
    'price', 'cost', 'quote', 'schedule', 'appointment', 'consultation',
    'interested', 'need help', 'looking for', 'want to', 'ready to'
  ];

  const messageText = userMessage.toLowerCase();
  const responseText = aiResponse.toLowerCase();

  // Capture lead if user shows interest or AI suggests next steps
  return leadTriggers.some(trigger => 
    messageText.includes(trigger) || responseText.includes('schedule') || responseText.includes('contact')
  );
}
