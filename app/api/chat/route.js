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

Business Info:
- Company: Test Real Estate Co
- We serve the local area with buying, selling, and rental services
- We have experienced agents ready to help
- We offer free consultations and market analysis

Guidelines:
- Be friendly and professional
- Ask qualifying questions to understand their needs
- Offer to schedule appointments or consultations
- Provide helpful real estate advice
- If they show serious buying/selling intent, be enthusiastic and helpful`;

    if (isHotLead) {
      systemPrompt += `\n\n🔥 HOT LEAD DETECTED! This customer is showing strong buying/selling intent. 
Be extra helpful and try to:
- Schedule an immediate consultation
- Get their contact information
- Understand their timeline
- Offer immediate assistance`;
      console.log('🔥 Hot lead detected in message!');
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages
    ];

    console.log('🤖 Calling OpenAI with', openaiMessages.length, 'messages');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('✅ Got AI response:', aiResponse.substring(0, 100) + '...');

    // Try to save to database if available
    if (dbAvailable) {
      try {
        // Get or create customer
        let customer = await db.getCustomerByClerkId(userId);
        
        if (!customer) {
          console.log('👤 Creating new customer');
          customer = await db.createCustomer({
            clerk_user_id: userId,
            email: '',
            business_name: 'My Business',
            plan: 'basic'
          });
        }

        // Get or create conversation
        const key = conversationKey || `conv_${Date.now()}`;
        let conversation = await db.getConversationByKey(key);
        
        if (!conversation) {
          conversation = await db.createConversation({
            customer_id: customer.id,
            conversation_key: key,
            status: 'active'
          });
        }

        // Save messages
        await db.createMessage({
          conversation_id: conversation.id,
          sender_type: 'user',
          content: userMessage.content
        });

        await db.createMessage({
          conversation_id: conversation.id,
          sender_type: 'assistant',
          content: aiResponse
        });

        // Create hot lead alert if detected
        if (isHotLead) {
          try {
            await db.createHotLeadAlert({
              conversation_id: conversation.id,
              customer_id: customer.id,
              trigger_message: userMessage.content,
              keywords_matched: HOT_LEAD_KEYWORDS.filter(keyword => 
                messageContent.includes(keyword.toLowerCase())
              ),
              status: 'new'
            });
            console.log('🔥 Hot lead alert created!');
          } catch (alertError) {
            console.log('⚠️ Hot lead alert failed:', alertError.message);
          }
        }

        console.log('💾 Saved conversation to database');

        return NextResponse.json({
          response: aiResponse,
          conversationKey: conversation.conversation_key,
          customerId: customer.id,
          isHotLead: isHotLead
        });

      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        // Continue without database - just return AI response
      }
    }

    // Return response (with or without database)
    return NextResponse.json({
      response: aiResponse,
      conversationKey: conversationKey || `conv_${Date.now()}`,
      isHotLead: isHotLead,
      mode: dbAvailable ? 'database_error' : 'no_database'
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Return a helpful error response
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to contact us directly for immediate assistance with your real estate needs!",
      error: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handle GET requests for testing
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
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
        });
        
        console.log('✅ OpenAI connection test successful');
        return NextResponse.json({ 
          connected: true, 
          message: 'OpenAI Connected Successfully!',
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
