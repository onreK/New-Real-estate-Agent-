import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { 
  getDbClient,
  createConversation,
  getConversationByKey,
  createMessage,
  createHotLeadAlert,
  getConversationMessages,
  getCustomerByClerkId,
  createCustomer
} from '../../../lib/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hot lead keywords that trigger immediate alerts
const HOT_LEAD_KEYWORDS = [
  // Buying intent
  'ready to buy', 'want to purchase', 'looking to buy', 'interested in buying',
  'need to buy', 'planning to buy', 'ready to make an offer', 'want to make an offer',
  'cash buyer', 'pre-approved', 'preapproved', 'have financing', 'financing approved',
  
  // Selling intent
  'want to sell', 'need to sell', 'ready to sell', 'thinking of selling',
  'looking to sell', 'sell my house', 'sell my home', 'list my property',
  
  // Urgency indicators
  'urgent', 'asap', 'immediately', 'right away', 'this week', 'this month',
  'relocating', 'job transfer', 'moving soon', 'deadline', 'closing soon',
  
  // Financial readiness
  'cash offer', 'cash deal', 'no financing needed', 'funds available',
  'down payment ready', 'approved mortgage', 'loan approved',
  
  // Specific requests
  'schedule showing', 'book appointment', 'set up meeting', 'available today',
  'available tomorrow', 'free this week', 'when can we meet'
];

export async function POST(req) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, conversationKey } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    console.log('💬 Chat API called for user:', userId);

    // Get or create customer record for this Clerk user
    let customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      console.log('👤 Creating customer record for chat user:', userId);
      
      // Create customer if they don't exist (fallback for existing users)
      const customerData = {
        id: Date.now(),
        name: 'Customer', // Will be updated when they provide info
        email: '', // Will be updated from Clerk user data if needed
        phone: '',
        clerk_user_id: userId,
        created_at: new Date().toISOString(),
        subscription_tier: 'basic',
        subscription_status: 'trial'
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for chat user:', customer.id);
    }

    console.log('💬 Processing chat for customer:', customer.id);

    const db = getDbClient();
    let conversation;
    
    // Get or create conversation
    if (conversationKey) {
      conversation = await getConversationByKey(conversationKey, customer.id);
    }
    
    if (!conversation) {
      const conversationData = {
        customer_id: customer.id, // Use real customer ID
        conversation_key: conversationKey || `conv_${Date.now()}_${customer.id}`,
        channel: 'web',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      conversation = await createConversation(conversationData);
      console.log('✅ Created new conversation:', conversation.id, 'for customer:', customer.id);
    }

    // Get conversation history for context
    const conversationHistory = await getConversationMessages(conversation.id);
    
    // Build messages for OpenAI (include history for context)
    const systemMessage = {
      role: 'system',
      content: `You are a professional real estate AI assistant. You help potential clients with buying, selling, and real estate questions.

Key Information:
- You work for a professional real estate team
- Always be helpful, professional, and knowledgeable
- If someone seems ready to buy/sell or shows urgency, prioritize scheduling a consultation
- Keep responses concise but informative
- Ask qualifying questions to understand their needs better

Guidelines:
- For buying: Ask about budget, preferred areas, timeline, home preferences
- For selling: Ask about property details, timeline, reason for selling
- Always offer to schedule a consultation for serious inquiries
- Be conversational but professional
- If you don't know specific market data, recommend speaking with an agent`
    };

    // Combine conversation history with new messages
    const allMessages = [
      systemMessage,
      ...conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      ...messages
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // Save user message
    const userMessage = messages[messages.length - 1];
    if (userMessage && userMessage.role === 'user') {
      await createMessage({
        conversation_id: conversation.id,
        sender: 'user',
        content: userMessage.content,
        created_at: new Date().toISOString()
      });

      // Check for hot lead indicators
      const messageContent = userMessage.content.toLowerCase();
      const isHotLead = HOT_LEAD_KEYWORDS.some(keyword => 
        messageContent.includes(keyword.toLowerCase())
      );

      if (isHotLead) {
        await createHotLeadAlert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          trigger_message: userMessage.content,
          keywords_matched: HOT_LEAD_KEYWORDS.filter(keyword => 
            messageContent.includes(keyword.toLowerCase())
          ),
          created_at: new Date().toISOString(),
          status: 'new'
        });
        
        console.log('🔥 HOT LEAD DETECTED for customer:', customer.id);
      }
    }

    // Save AI response
    await createMessage({
      conversation_id: conversation.id,
      sender: 'assistant',
      content: aiResponse,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      response: aiResponse,
      conversationKey: conversation.conversation_key,
      customerId: customer.id
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing and backwards compatibility
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'test-connection') {
      // Test OpenAI connection
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10,
        });
        
        return NextResponse.json({ 
          connected: true, 
          message: 'OpenAI Connected Successfully!' 
        });
      } catch (error) {
        return NextResponse.json({ 
          connected: false, 
          error: error.message 
        });
      }
    }

    if (action === 'conversations') {
      // Get user-specific conversations
      const { userId } = auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const customer = await getCustomerByClerkId(userId);
      
      if (!customer) {
        return NextResponse.json({
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0
        });
      }

      const conversations = await getConversationsByCustomer(customer.id);
      const stats = await getCustomerStats(customer.id);

      return NextResponse.json({
        conversations,
        totalConversations: stats.total_conversations || 0,
        totalMessages: stats.total_messages || 0,
        leadsGenerated: stats.total_hot_leads || 0
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Chat GET API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
