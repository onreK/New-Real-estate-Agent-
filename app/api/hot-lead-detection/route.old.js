import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Hot lead scoring criteria
const HOT_LEAD_KEYWORDS = {
  HIGH_INTENT: [
    'want to buy', 'ready to purchase', 'ready to buy', 'need to buy',
    'looking to buy', 'interested in buying', 'budget is', 'my budget',
    'call me', 'contact me', 'phone number', 'when can we meet',
    'schedule appointment', 'need asap', 'urgent', 'today',
    'this week', 'available now', 'let\'s do this', 'ready to move forward'
  ],
  MEDIUM_INTENT: [
    'interested in', 'tell me more', 'more information', 'pricing',
    'how much', 'cost', 'price', 'available', 'schedule',
    'appointment', 'consultation', 'meeting', 'discuss',
    'learn more', 'details', 'options', 'services'
  ],
  LOW_INTENT: [
    'just looking', 'browsing', 'general information', 'hours',
    'location', 'what do you do', 'about your company',
    'just curious', 'maybe later', 'thinking about it'
  ]
};

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!openai) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI not configured',
        isHotLead: false,
        score: 0
      });
    }

    console.log('🔥 Analyzing hot lead for message:', message);

    // Create conversation context
    const conversationContext = conversationHistory.length > 0 
      ? `\n\nConversation history:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a hot lead detection AI. Analyze the customer message and conversation history to determine if this is a hot lead (someone ready to buy/engage).

Score from 0-10 where:
- 0-3: Just browsing, low intent, general inquiries
- 4-6: Interested, medium intent, seeking information
- 7-8: Strong interest, high intent, likely to convert soon
- 9-10: Ready to buy NOW, urgent intent, immediate action needed

Look for these indicators:

🔥 HIGH INTENT (8-10):
- Buying language: "want to buy", "ready to purchase", "need to buy now"
- Budget mentions: "my budget is X", "I can spend X"
- Urgency: "need ASAP", "today", "this week", "urgent"
- Contact requests: "call me", "let's meet", "schedule appointment"
- Decision-making: "ready to move forward", "let's do this"

🔥 MEDIUM INTENT (5-7):
- Interest: "interested in", "tell me more", "pricing information"
- Research: "how much does it cost", "what are your rates"
- Engagement: "can we schedule", "available times", "more details"
- Consideration: "looking into options", "comparing services"

🔥 LOW INTENT (1-4):
- Browsing: "just looking", "browsing your site", "general information"
- Basic: "what are your hours", "where are you located"
- Casual: "just curious", "maybe later", "thinking about it"

Important: Consider the conversation flow. Multiple messages showing progression from low to high intent should score higher.

Respond with ONLY valid JSON in this exact format:
{
  "score": number,
  "isHotLead": boolean,
  "reasoning": "brief explanation of why this score was assigned",
  "keywords": ["detected", "keywords", "that", "influenced", "score"],
  "urgency": "low|medium|high",
  "nextAction": "suggested next step for business owner"
}`
        },
        {
          role: "user",
          content: `Current message: "${message}"${conversationContext}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const response = completion.choices[0].message.content.trim();
    console.log('🤖 OpenAI raw response:', response);

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback analysis
      analysis = {
        score: 0,
        isHotLead: false,
        reasoning: 'Analysis failed - JSON parse error',
        keywords: [],
        urgency: 'low',
        nextAction: 'Follow up with standard response'
      };
    }

    // Ensure isHotLead is properly set based on score
    analysis.isHotLead = analysis.score >= 7;

    console.log('✅ Hot lead analysis complete:', analysis);

    return NextResponse.json({
      success: true,
      ...analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Hot lead detection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      isHotLead: false,
      score: 0,
      reasoning: 'Analysis failed due to technical error',
      keywords: [],
      urgency: 'low',
      nextAction: 'Manual review recommended'
    }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({
    success: true,
    message: 'Hot Lead Detection API is running',
    criteria: HOT_LEAD_KEYWORDS,
    endpoints: {
      'POST /api/hot-lead-detection': 'Analyze message for hot lead potential'
    }
  });
}
