import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import database functions with proper error handling
let dbAvailable = false;
let db = {};

try {
  const database = await import('../../../lib/database.js');
  db = database;
  dbAvailable = true;
  console.log('✅ Database functions loaded successfully');
} catch (error) {
  console.log('⚠️ Database not available, using fallback mode:', error.message);
  dbAvailable = false;
}

// Hot lead keywords
const HOT_LEAD_KEYWORDS = [
  'ready to buy', 'want to purchase', 'looking to buy', 'interested in buying',
  'need to buy', 'planning to buy', 'ready to make an offer', 'want to make an offer',
  'cash buyer', 'pre-approved', 'preapproved', 'have financing', 'financing approved',
  'want to sell', 'need to sell', 'ready to sell', 'thinking of selling',
  'urgent', 'asap', 'immediately', 'right away', 'this week', 'this month',
  'schedule showing', 'book appointment', 'set up meeting', 'available today'
];

export async function POST(req) {
  try {
    console.log('💬 Chat POST request received');

    const { userId } = auth();
    
    if (!userId) {
      console.log('❌ No userId from auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Chat request from user:', userId);

    const body = await req.json();
    const { messages, conversationKey } = body;
    
    if (!messages || !Array.isArray(messages)) {
      console.log('❌ Invalid messages format');
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1];
    if (!userMessage || !userMessage.content) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }

    console.log('📝 User message:', userMessage.content);

    // Check for hot lead keywords
    const messageContent = userMessage.content.toLowerCase();
    const isHotLead = HOT_LEAD_KEYWORDS.some(keyword => 
      messageContent.includes(keyword.toLowerCase())
    );

    // Build system prompt based on hot lead status
    let systemPrompt = `You are a professional AI assistant for Test Real Estate Co. 
You help customers with all their real estate needs including buying, selling, and renting properties.

Be helpful, professional, and knowledgeable about real estate.
Always aim to capture leads and schedule appointments when appropriate.

${isHotLead ? `
🔥 HOT LEAD DETECTED! This customer appears ready to take action.
- Be extra attentive and helpful
- Try to schedule a meeting or phone call
- Ask for contact information if appropriate
- Emphasize urgency and availability
` : ''}

If asked about specific properties, services, or to schedule appointments, be helpful and encouraging.
Always maintain a professional, friendly tone.`;

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role || (msg.content ? 'user' : 'assistant'),
          content: msg.content || msg.message || ''
        }))
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, but I had trouble processing your request. Please try again.';

    console.log('🤖 Assistant response generated');

    // Save to database if available
    if (dbAvailable && db.saveConversation) {
      try {
        await db.saveConversation({
          userId,
          userMessage: userMessage.content,
          assistantMessage,
          isHotLead,
          conversationKey
        });
        console.log('💾 Conversation saved to database');
      } catch (dbError) {
        console.error('❌ Failed to save conversation:', dbError);
        // Continue without failing the request
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      hotLead: isHotLead,
      conversationId: conversationKey || 'temp-' + Date.now()
    });

  } catch (error) {
    console.error('❌ Chat POST API Error:', error);
    
    return NextResponse.json({
      error: 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// Handle GET requests for testing and conversations
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    console.log('💬 Chat GET request, action:', action);

    // Support both 'test' and 'test-connection' for compatibility
    if (action === 'test' || action === 'test-connection') {
      // Test OpenAI connection
      try {
        console.log('🧪 Testing OpenAI connection...');
        
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY not found in environment variables');
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        });

        console.log('✅ OpenAI connection test successful');
        
        return NextResponse.json({ 
          connected: true, 
          message: 'OpenAI API connection successful',
          model: 'gpt-4o-mini',
          database: dbAvailable ? 'Available' : 'Not Available'
        });
      } catch (error) {
        console.log('❌ OpenAI connection test failed:', error.message);
        return NextResponse.json({ 
          connected: false, 
          error: error.message 
        });
      }
    }

    if (action === 'conversations') {
      const { userId } = auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!dbAvailable) {
        return NextResponse.json({
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          message: 'Database not available'
        });
      }

      try {
        const customer = await db.getCustomerByClerkId(userId);
        
        if (!customer) {
          return NextResponse.json({
            conversations: [],
            totalConversations: 0,
            totalMessages: 0,
            leadsGenerated: 0
          });
        }

        const conversations = await db.getConversationsByCustomer(customer.id);
        const stats = await db.getCustomerStats(customer.id);

        return NextResponse.json({
          conversations,
          totalConversations: stats.total_conversations || 0,
          totalMessages: stats.total_messages || 0,
          leadsGenerated: stats.total_hot_leads || 0
        });

      } catch (dbError) {
        console.error('❌ Database error in conversations:', dbError);
        return NextResponse.json({
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          error: 'Database error'
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Chat GET API Error:', error);
    
    return NextResponse.json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
