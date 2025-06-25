import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Hot lead scoring criteria
const HOT_LEAD_KEYWORDS = {
  // Buying intent (high score)
  buying: [
    'want to buy', 'ready to purchase', 'looking to buy', 'interested in buying',
    'ready to move forward', 'let\'s do this', 'I\'ll take it', 'sign me up',
    'where do I sign', 'let\'s proceed', 'I\'m ready', 'let\'s get started'
  ],
  
  // Urgency indicators (high score)
  urgency: [
    'today', 'this week', 'ASAP', 'urgent', 'immediately', 'right away',
    'need quickly', 'time sensitive', 'deadline', 'soon as possible'
  ],
  
  // Budget/qualification (medium-high score)
  qualified: [
    'budget is', 'can afford', 'price range', 'financing approved',
    'pre-approved', 'cash buyer', 'have the money', 'budget of'
  ],
  
  // Contact requests (medium score) 
  contact: [
    'call me', 'can you call', 'let\'s talk', 'phone number',
    'schedule', 'meet', 'appointment', 'visit', 'come see'
  ],
  
  // Interest indicators (low-medium score)
  interest: [
    'interested', 'tell me more', 'sounds good', 'looks great',
    'that works', 'perfect', 'exactly what I need'
  ]
};

const SCORE_WEIGHTS = {
  buying: 4,
  urgency: 3,
  qualified: 3,
  contact: 2,
  interest: 1
};

function calculateKeywordScore(message) {
  let score = 0;
  const lowerMessage = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(HOT_LEAD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        score += SCORE_WEIGHTS[category];
      }
    }
  }
  
  return Math.min(score, 6); // Cap keyword score at 6
}

async function analyzeWithAI(conversation, businessContext) {
  if (!openai) {
    // Fallback scoring without AI
    const lastMessage = conversation[conversation.length - 1]?.content || '';
    return calculateKeywordScore(lastMessage);
  }

  try {
    const prompt = `You are a lead qualification expert. Analyze this conversation and score the lead's buying intent from 0-4.

Business Context: ${businessContext}

Conversation:
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Score the lead's buying intent (0-4):
0 = Just browsing, no intent
1 = Mild interest, asking basic questions  
2 = Moderate interest, asking specific questions
3 = Strong interest, discussing details/pricing
4 = Very hot, ready to buy or take action

Respond with just the number (0-4) and a brief reason.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1
    });

    const result = response.choices[0].message.content.trim();
    const scoreMatch = result.match(/^(\d)/);
    const aiScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    return Math.min(aiScore, 4); // Cap AI score at 4
    
  } catch (error) {
    console.error('AI scoring error:', error);
    // Fallback to keyword scoring
    const lastMessage = conversation[conversation.length - 1]?.content || '';
    return Math.min(calculateKeywordScore(lastMessage) / 2, 4);
  }
}

function extractLeadInfo(conversation) {
  let name = null;
  let phone = null;
  let email = null;
  let details = [];

  for (const msg of conversation) {
    if (msg.role === 'user') {
      const content = msg.content;
      
      // Extract phone number
      const phoneMatch = content.match(/(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch && !phone) {
        phone = phoneMatch[0];
      }
      
      // Extract email
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !email) {
        email = emailMatch[0];
      }
      
      // Extract potential name (simple heuristic)
      if (content.toLowerCase().includes('my name is') || content.toLowerCase().includes('i\'m ')) {
        const nameMatch = content.match(/(my name is|i'm)\s+([a-zA-Z\s]+)/i);
        if (nameMatch && !name) {
          name = nameMatch[2].trim().split(' ').slice(0, 2).join(' '); // First two words
        }
      }
      
      // Collect important details
      if (content.length > 20 && content.length < 200) {
        details.push(content);
      }
    }
  }

  return {
    name: name || 'Unknown',
    phone: phone || 'Not provided',
    email: email || 'Not provided',
    lastMessage: conversation[conversation.length - 1]?.content || '',
    keyDetails: details.slice(-2) // Last 2 important messages
  };
}

export async function POST(request) {
  try {
    const { 
      conversation, 
      source, 
      businessContext,
      customerId,
      businessPhone 
    } = await request.json();

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json({
        success: false,
        error: 'Conversation array is required'
      }, { status: 400 });
    }

    console.log('🔍 Analyzing lead:', {
      source,
      customerId,
      messageCount: conversation.length
    });

    // Calculate keyword-based score
    const keywordScore = calculateKeywordScore(
      conversation.map(msg => msg.content).join(' ')
    );

    // Get AI-based score
    const aiScore = await analyzeWithAI(conversation, businessContext || '');

    // Combine scores (keyword + AI, max 10)
    const totalScore = Math.min(keywordScore + aiScore, 10);

    // Extract lead information
    const leadInfo = extractLeadInfo(conversation);

    // Determine if this is a hot lead (score >= 7)
    const isHotLead = totalScore >= 7;

    const analysis = {
      leadScore: totalScore,
      keywordScore: keywordScore,
      aiScore: aiScore,
      isHotLead: isHotLead,
      leadInfo: leadInfo,
      source: source,
      businessPhone: businessPhone,
      timestamp: new Date().toISOString(),
      
      // Analysis details
      analysis: {
        buyingIntent: totalScore >= 7 ? 'High' : totalScore >= 5 ? 'Medium' : 'Low',
        urgency: keywordScore >= 3 ? 'High' : 'Medium',
        qualification: leadInfo.phone !== 'Not provided' ? 'Qualified' : 'Needs qualification'
      }
    };

    console.log('✅ Lead analysis complete:', {
      score: totalScore,
      isHot: isHotLead,
      source: source
    });

    return NextResponse.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('❌ Hot Lead Detection Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze lead'
    }, { status: 500 });
  }
}

// Simple GET endpoint for testing
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testMessage = searchParams.get('message') || 'I want to buy a house today';
  
  const testConversation = [
    { role: 'user', content: testMessage }
  ];

  const keywordScore = calculateKeywordScore(testMessage);
  
  return NextResponse.json({
    success: true,
    testMessage,
    keywordScore,
    isHotLead: keywordScore >= 4,
    keywords: HOT_LEAD_KEYWORDS
  });
}
