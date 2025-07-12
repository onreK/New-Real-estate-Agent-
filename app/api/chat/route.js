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

// Import AI config functions
let getAIConfigForUser;
try {
  const configModule = await import('../ai-config/route.js');
  getAIConfigForUser = configModule.getCurrentAIConfig;
} catch (error) {
  console.log('⚠️ AI Config not available, using defaults');
  getAIConfigForUser = () => ({
    personality: 'professional',
    knowledgeBase: 'always ask for the customer\'s name, and require email or phone number from the customer',
    model: 'gpt-4o-mini',
    creativity: 0.7,
    maxTokens: 500,
    systemPrompt: ''
  });
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

// Personality-based system prompts
const getPersonalityPrompt = (personality, knowledgeBase, businessInfo = '') => {
  const basePrompts = {
    professional: `You are a professional AI assistant for ${businessInfo || 'Test Real Estate Co'}. You provide clear, direct, and helpful responses. Always maintain a business-appropriate tone and focus on delivering value to customers.`,
    
    friendly: `You are a friendly and conversational AI assistant for ${businessInfo || 'Test Real Estate Co'}. You're warm, approachable, and make customers feel comfortable. Use a casual but respectful tone and show genuine interest in helping.`,
    
    enthusiastic: `You are an enthusiastic and energetic AI assistant for ${businessInfo || 'Test Real Estate Co'}. You're excited about helping customers and passionate about the services you provide. Show excitement and positivity in your responses.`,
    
    empathetic: `You are an empathetic and understanding AI assistant for ${businessInfo || 'Test Real Estate Co'}. You listen carefully to customer needs, show understanding of their concerns, and provide supportive guidance.`,
    
    expert: `You are an expert technical AI assistant for ${businessInfo || 'Test Real Estate Co'}. You provide detailed, accurate information and demonstrate deep knowledge of your field. Use professional terminology appropriately.`
  };

  let prompt = basePrompts[personality] || basePrompts.professional;
  
  if (knowledgeBase && knowledgeBase.trim()) {
    prompt += `\n\nImportant business information:\n${knowledgeBase}`;
  }
  
  prompt += `\n\nAlways aim to capture leads and schedule appointments when appropriate. Be helpful, professional, and knowledgeable about real estate.`;
  
  return prompt;
};

export async function POST(req) {
  try {
    console.log('💬 Chat POST request received');

    const { userId } = auth();
    
    if (!userId) {
      console.log('❌ No userId from auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Chat request from user:', userId);

    // Get AI configuration for this user
    const aiConfig = getAIConfigForUser(userId);
    console.log('🤖 Using AI config:', {
      personality: aiConfig.personality,
      model: aiConfig.model,
      creativity: aiConfig.creativity,
      maxTokens: aiConfig.maxTokens
    });

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

    // Build system prompt based on AI configuration
    let systemPrompt;
    if (aiConfig.systemPrompt && aiConfig.systemPrompt.trim()) {
      // Use custom system prompt if provided
      systemPrompt = aiConfig.systemPrompt;
      console.log('📝 Using custom system prompt');
    } else {
      // Use personality-based prompt with knowledge base
      systemPrompt = getPersonalityPrompt(
        aiConfig.personality, 
        aiConfig.knowledgeBase,
        'Test Real Estate Co'
      );
      console.log('🎭 Using personality-based prompt:', aiConfig.personality);
    }

    // Prepare messages for OpenAI
    const openAIMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log('🚀 Calling OpenAI with model:', aiConfig.model);

    // Call OpenAI with user's configuration
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: openAIMessages,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.creativity,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('✅ AI Response generated:', aiResponse.substring(0, 100) + '...');

    // Try to save to database if available
    if (dbAvailable) {
      try {
        const customer = await db.getOrCreateCustomer(userId, userMessage.email || null);
        
        const conversation = await db.saveConversation({
          customer_id: customer.id,
          conversation_key: conversationKey || `conv_${Date.now()}`,
          user_message: userMessage.content,
          ai_response: aiResponse,
          channel: 'web_chat',
          is_hot_lead: isHotLead
        });

        // Send hot lead alert if needed
        if (isHotLead) {
          try {
            await db.sendHotLeadAlert({
              customer,
              conversation,
              message: userMessage.content,
              urgency: 'High',
              score: Math.floor(Math.random() * 3) + 8 // Demo score 8-10
            });
            console.log('🚨 Hot lead alert sent');
          } catch (alertError) {
            console.log('⚠️ Hot lead alert failed:', alertError.message);
          }
        }

        console.log('💾 Saved conversation to database');

        return NextResponse.json({
          response: aiResponse,
          conversationKey: conversation.conversation_key,
          customerId: customer.id,
          isHotLead: isHotLead,
          aiConfig: {
            personality: aiConfig.personality,
            model: aiConfig.model
          }
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
      mode: dbAvailable ? 'database_error' : 'no_database',
      aiConfig: {
        personality: aiConfig.personality,
        model: aiConfig.model
      }
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
          success: true,
          message: 'OpenAI Connected Successfully!',
          model: 'gpt-4o-mini',
          database: dbAvailable ? 'Available' : 'Not Available'
        });
      } catch (error) {
        console.log('❌ OpenAI connection test failed:', error.message);
        return NextResponse.json({ 
          connected: false,
          success: false,
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
