import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { 
  createConversation,
  getConversationByKey,
  createMessage,
  createHotLeadAlert,
  getConversationMessages,
  getCustomerByClerkId,
  createCustomer,
  getConversationsByCustomer,
  getCustomerStats
} from '../../../lib/database.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hot lead keywords that trigger immediate alerts
const HOT_LEAD_KEYWORDS = [
  'ready to buy', 'want to purchase', 'looking to buy', 'interested in buying',
  'need to buy', 'planning to buy', 'ready to make an offer', 'want to make an offer',
  'cash buyer', 'pre-approved', 'preapproved', 'have financing', 'financing approved',
  'want to sell', 'need to sell', 'ready to sell', 'thinking of selling',
  'looking to sell', 'sell my house', 'sell my home', 'list my property',
  'urgent', 'asap', 'immediately', 'right away', 'this week', 'this month',
  'relocating', 'job transfer', 'moving soon', 'deadline', 'closing soon',
  'cash offer', 'cash deal', 'no financing needed', 'funds available',
  'down payment ready', 'approved mortgage', 'loan approved',
  'schedule showing', 'book appointment', 'set up meeting', 'available today',
  'available tomorrow', 'free this week', 'when can we meet'
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

    // Get or create customer record for this Clerk user
    let customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      console.log('👤 Creating new customer for chat user:', userId);
      
      // Use Postgres-compatible customer data structure
      const customerData = {
        clerk_user_id: userId,
        email: '', // Will be updated from Clerk user data if needed
        business_name: 'My Business', // Default business name
        plan: 'basic' // Using 'plan' field from Postgres schema
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created customer:', customer.id);
    }

    console.log('💬 Processing chat for customer:', customer.id);

    let conversation;
    
    // Get or create conversation
    if (conversationKey) {
      conversation = await getConversationByKey(conversationKey, customer.id);
      console.log('🔍 Found existing conversation:', conversation?.id);
    }
    
    if (!conversation) {
      // FIXED: Include all required fields for the database
      const conversationData = {
        customer_id: customer.id,
        conversation_key: conversationKey || `conv_${Date.now()}_${customer.id}`,
        source: 'web',   // Required field
        status: 'active' // Required field
      };
      
      conversation = await createConversation(conversationData);
      console.log('✅ Created new conversation:', conversation.id);
    }

    // Get conversation history for context
    const conversationHistory = await getConversationMessages(conversation.id);
    console.log('📚 Conversation history:', conversationHistory.length, 'messages');

    // Build messages for OpenAI
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

    console.log('🤖 Calling OpenAI with', allMessages.length, 'messages');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('✅ Got AI response:', aiResponse.substring(0, 100) + '...');

    // Save user message
    const userMessage = messages[messages.length - 1];
    if (userMessage && userMessage.role === 'user') {
      await createMessage({
        conversation_id: conversation.id,
        sender: 'user',
        content: userMessage.content
      });

      console.log('💾 Saved user message');

      // Check for hot lead indicators
      const messageContent = userMessage.content.toLowerCase();
      const matchedKeywords = HOT_LEAD_KEYWORDS.filter(keyword => 
        messageContent.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        await createHotLeadAlert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          trigger_message: userMessage.content,
          keywords_matched: matchedKeywords,
          status: 'new'
        });
        
        console.log('🔥 HOT LEAD DETECTED! Keywords:', matchedKeywords);
      }
    }

    // Save AI response
    await createMessage({
      conversation_id: conversation.id,
      sender: 'assistant',
      content: aiResponse
    });

    console.log('💾 Saved AI response');

    return NextResponse.json({
      response: aiResponse,
      conversationKey: conversation.conversation_key,
      customerId: customer.id
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // More detailed error logging for debugging
    if (error.code) {
      console.error('Database Error Code:', error.code);
    }
    if (error.detail) {
      console.error('Database Error Detail:', error.detail);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat message', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing and backwards compatibility
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    console.log('💬 Chat GET request, action:', action);

    if (action === 'test-connection') {
      // Test OpenAI connection
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10,
        });
        
        console.log('✅ OpenAI connection test successful');
        return NextResponse.json({ 
          connected: true, 
          message: 'OpenAI Connected Successfully!' 
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

      console.log('📊 Returning conversations for customer:', customer.id);

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
    
    // More detailed error logging for debugging
    if (error.code) {
      console.error('Database Error Code:', error.code);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
