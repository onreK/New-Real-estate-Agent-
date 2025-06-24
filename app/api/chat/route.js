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
    aiFeatures: ['chatbot', 'voice', 'lead-scoring']
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
    
    // Build system prompt based on business information
    const systemPrompt = createSystemPrompt(business);

    // Format conversation history for AI
    const formattedHistory = conversationHistory?.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })) || [];

    // Call OpenAI API (you'll need to add your API key)
    const aiResponse = await callOpenAI(systemPrompt, formattedHistory, message);

    // Check if we should capture lead information
    const shouldCaptureLead = checkShouldCaptureLead(message, aiResponse);

    return NextResponse.json({
      response: aiResponse,
      shouldCaptureLead,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

function createSystemPrompt(business) {
  const industryContext = getIndustryContext(business.industry);
  
  return `You are an AI assistant for ${business.businessName}, a ${business.industry} business.

BUSINESS CONTEXT:
- Business: ${business.businessName}
- Industry: ${business.industry}
- Description: ${business.businessDescription}
- Target Audience: ${business.targetAudience}

PERSONALITY & TONE:
- Be helpful, professional, and friendly
- Use a conversational but knowledgeable tone
- Show expertise in ${business.industry}
- Be concise but thorough in your responses

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

async function callOpenAI(systemPrompt, conversationHistory, newMessage) {
  // For now, return a simulated AI response
  // You'll replace this with actual OpenAI API call
  
  const simulatedResponses = [
    "Thank you for your interest! I'd be happy to help you with that. Could you tell me a bit more about what you're looking for?",
    "That's a great question! Based on what you've shared, here are a few options we can explore together...",
    "I understand what you're looking for. Let me connect you with the right information to help you make the best decision.",
    "Absolutely! We specialize in exactly that type of situation. Would you like to schedule a quick consultation to discuss your specific needs?",
    "That sounds like something we can definitely help you with. What's your timeline for moving forward with this?",
    "Great! I think you'd benefit from speaking with one of our specialists who can give you personalized advice. Would you like me to arrange that?"
  ];

  // Simple logic to vary responses
  const responseIndex = Math.floor(Math.random() * simulatedResponses.length);
  let response = simulatedResponses[responseIndex];

  // Add business-specific context
  if (newMessage.toLowerCase().includes('price') || newMessage.toLowerCase().includes('cost')) {
    response = "Pricing varies based on your specific needs and situation. I'd love to have one of our team members provide you with a personalized quote. Would you like to schedule a brief consultation?";
  }

  if (newMessage.toLowerCase().includes('schedule') || newMessage.toLowerCase().includes('appointment')) {
    response = "I'd be happy to help you schedule an appointment! Let me get your contact information so we can find a time that works best for you.";
  }

  return response;

  /* 
  // UNCOMMENT AND CONFIGURE WHEN YOU'RE READY TO USE REAL AI:
  
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: newMessage }
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  const data = await openaiResponse.json();
  return data.choices[0].message.content;
  */
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
