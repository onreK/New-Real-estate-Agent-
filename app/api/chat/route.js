import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Fixed import path - same pattern as setup-database route
import { 
  getDbClient, 
  createConversation, 
  getConversationByKey, 
  createMessage, 
  getConversationMessages,
  createHotLeadAlert,
  getCustomerById,
  getCustomerByClerkId 
} from '../../../lib/database.js';

// Initialize OpenAI with debugging
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Debug: Log connection status
console.log('🤖 OpenAI Connection Status:', {
  hasApiKey: !!process.env.OPENAI_API_KEY,
  keyPreview: process.env.OPENAI_API_KEY ? 'sk-proj...' : 'Not found',
  clientInitialized: !!openai,
  timestamp: new Date().toISOString()
});

// Default AI configuration (fallback)
const defaultConfig = {
  id: 'default',
  customer_id: 1, // Default demo customer
  businessName: 'Test Real Estate Co',
  personality: 'professional',
  businessInfo: `We are a full-service real estate company specializing in:
• Residential home sales and purchases
• Commercial property investments  
• Property management services
• First-time buyer assistance
• Market analysis and valuations

Our experienced agents help clients navigate the real estate market with personalized service and local expertise. We're committed to making your real estate goals a reality.`,
  model: 'gpt-4o-mini',
  creativity: 0.7,
  responseLength: 'medium',
  knowledgeBase: 'Our office is located in Chester, Virginia. We serve the Richmond metro area and surrounding counties. Contact us at (804) 555-0123 or visit our website for more information.',
  welcomeMessage: 'Hi! I\'m the AI assistant for Test Real Estate Co. How can I help you with your real estate needs today?',
  enableHotLeadAlerts: true,
  businessOwnerPhone: null,
  alertBusinessHours: true
};

// Get AI configuration from database or default
async function getAIConfig(configId = 'default', customerId = 1) {
  try {
    if (configId === 'default') {
      return defaultConfig;
    }

    const client = await getDbClient();
    const result = await client.query(`
      SELECT ac.*, c.business_name as customer_business_name 
      FROM ai_configs ac
      LEFT JOIN customers c ON ac.customer_id = c.id
      WHERE ac.id = $1 OR ac.customer_id = $2
      ORDER BY ac.created_at DESC
      LIMIT 1
    `, [configId, customerId]);

    if (result.rows.length > 0) {
      const config = result.rows[0];
      return {
        id: config.id,
        customer_id: config.customer_id,
        businessName: config.business_name || config.customer_business_name || 'Your Business',
        personality: config.personality || 'professional',
        businessInfo: config.business_info || defaultConfig.businessInfo,
        model: config.model || 'gpt-4o-mini',
        creativity: parseFloat(config.creativity) || 0.7,
        responseLength: config.response_length || 'medium',
        knowledgeBase: config.knowledge_base || defaultConfig.knowledgeBase,
        welcomeMessage: config.welcome_message || defaultConfig.welcomeMessage,
        enableHotLeadAlerts: config.enable_hot_lead_alerts !== false,
        businessOwnerPhone: config.business_owner_phone,
        alertBusinessHours: config.alert_business_hours !== false
      };
    }

    return defaultConfig;
  } catch (error) {
    console.error('Error getting AI config:', error);
    return defaultConfig;
  }
}

// Hot lead detection function
async function analyzeHotLead(message, conversationHistory = []) {
  try {
    console.log('🔥 Starting hot lead analysis for message:', message.slice(0, 50) + '...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hot-lead-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`Hot lead API error: ${response.status}`);
    }

    const analysis = await response.json();
    console.log('✅ Hot lead analysis result:', analysis);
    return analysis;

  } catch (error) {
    console.error('❌ Hot lead analysis error:', error);
    return {
      success: false,
      isHotLead: false,
      score: 0,
      reasoning: 'Analysis failed',
      keywords: [],
      urgency: 'low',
      nextAction: 'Standard follow-up'
    };
  }
}

// Send business owner alert for hot leads
async function sendHotLeadAlert(leadAnalysis, message, customerConfig, conversationId, messageId) {
  if (!leadAnalysis.isHotLead || !customerConfig.businessOwnerPhone) {
    return false;
  }

  try {
    console.log('📢 Sending hot lead alert...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/business-owner-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessOwnerPhone: customerConfig.businessOwnerPhone,
        leadInfo: {
          phone: 'Web Visitor',
          score: leadAnalysis.score,
          reasoning: leadAnalysis.reasoning,
          nextAction: leadAnalysis.nextAction
        },
        messageContent: message,
        customerConfig: {
          businessName: customerConfig.businessName,
          enableHotLeadAlerts: customerConfig.enableHotLeadAlerts !== false,
          alertBusinessHours: customerConfig.alertBusinessHours
        },
        source: 'web'
      })
    });

    const result = await response.json();
    console.log('📱 Hot lead alert result:', result);
    
    // Store hot lead alert in database
    if (result.success && result.alertSent) {
      try {
        await createHotLeadAlert({
          customer_id: customerConfig.customer_id,
          conversation_id: conversationId,
          message_id: messageId,
          business_owner_phone: customerConfig.businessOwnerPhone,
          lead_score: leadAnalysis.score,
          lead_phone: 'Web Visitor',
          message_content: message,
          ai_reasoning: leadAnalysis.reasoning,
          next_action: leadAnalysis.nextAction,
          urgency: leadAnalysis.urgency,
          source: 'web_chat'
        });
      } catch (dbError) {
        console.error('Error storing hot lead alert:', dbError);
      }
    }
    
    return result.success && result.alertSent;

  } catch (error) {
    console.error('❌ Hot lead alert error:', error);
    return false;
  }
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    console.log('💬 Chat API called at:', new Date().toISOString());
    
    const body = await request.json();
    const { 
      message, 
      conversationId = 'web_chat_' + Date.now(), 
      configId = 'default',
      customerId = 1, // Default to demo customer
      smsMode = false,
      testMode = false 
    } = body;

    console.log('📝 Chat request:', {
      messageLength: message?.length || 0,
      conversationId,
      configId,
      customerId,
      smsMode,
      testMode,
      messagePreview: message?.slice(0, 50) + '...'
    });

    // Validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string',
        received: { message, type: typeof message }
      }, { status: 400 });
    }

    // Test database connection first
    try {
      console.log('🗄️ Testing database connection...');
      const client = await getDbClient();
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json({
        response: "I'm experiencing database connectivity issues. Please try again in a moment.",
        isAI: false,
        error: 'Database connection failed',
        debug: {
          dbError: dbError.message,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    // Get AI configuration
    const aiConfig = await getAIConfig(configId, customerId);
    console.log('⚙️ Using AI config:', {
      businessName: aiConfig.businessName,
      personality: aiConfig.personality,
      model: aiConfig.model,
      customerId: aiConfig.customer_id
    });

    // OpenAI availability check
    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return NextResponse.json({
        response: "I'm experiencing some technical difficulties connecting to my AI service. Please try again in a moment, or contact our support team if this continues.",
        isAI: false,
        error: 'OpenAI not configured',
        debug: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get or create conversation in database
    let conversation;
    try {
      conversation = await getConversationByKey(conversationId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await createConversation({
          customer_id: aiConfig.customer_id,
          conversation_key: conversationId,
          source: 'web_chat',
          visitor_info: {
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString()
          }
        });
        console.log('📝 Created new conversation:', conversation.id);
      }
    } catch (dbError) {
      console.error('❌ Database conversation error:', dbError);
      return NextResponse.json({
        response: "I'm experiencing database issues. Please try again in a moment.",
        isAI: false,
        error: 'Database conversation error',
        debug: {
          dbError: dbError.message,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    // Get recent conversation history from database
    let recentMessages = [];
    try {
      recentMessages = await getConversationMessages(conversation.id, 6);
    } catch (dbError) {
      console.error('Error getting conversation messages:', dbError);
      // Continue with empty history if this fails
    }
    
    // Create user message in database
    let userMessage;
    try {
      userMessage = await createMessage({
        conversation_id: conversation.id,
        customer_id: aiConfig.customer_id,
        content: message,
        sender_type: 'user',
        processing_time_ms: Date.now() - startTime
      });
    } catch (dbError) {
      console.error('Error creating user message:', dbError);
      // Continue without storing message if this fails
    }

    // Prepare conversation history for AI (including new user message)
    const conversationHistory = [
      ...recentMessages.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Build system prompt based on configuration
    let systemPrompt = `You are an AI assistant for ${aiConfig.businessName} with a ${aiConfig.personality} personality.

Business Information:
${aiConfig.businessInfo}

${aiConfig.knowledgeBase ? `Additional Knowledge:
${aiConfig.knowledgeBase}` : ''}

Key Instructions:
- Be helpful, ${aiConfig.personality}, and professional
- Focus on ${aiConfig.businessName} and our services
- ${smsMode ? 'Keep responses under 160 characters for SMS' : 'Provide detailed, helpful responses'}
- If asked about services not mentioned in the business info, politely redirect to what we do offer
- For scheduling or specific requests, offer to connect them with a human representative
- Always aim to help and provide value to potential customers

${aiConfig.responseLength === 'short' ? 'Keep responses concise and to the point.' : 
  aiConfig.responseLength === 'long' ? 'Provide detailed, comprehensive responses.' : 
  'Provide balanced, moderately detailed responses.'}`;

    console.log('🤖 Calling OpenAI with model:', aiConfig.model);

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      max_tokens: smsMode ? 100 : (aiConfig.responseLength === 'short' ? 150 : aiConfig.responseLength === 'long' ? 500 : 300),
      temperature: aiConfig.creativity || 0.7
    });

    const aiResponse = completion.choices[0].message.content.trim();
    const processingTime = Date.now() - startTime;

    console.log('✅ AI response generated:', {
      length: aiResponse.length,
      model: aiConfig.model,
      usage: completion.usage,
      processingTime: processingTime + 'ms'
    });

    // Analyze for hot lead (only for non-test messages)
    let hotLeadAnalysis = null;
    let alertSent = false;

    if (!testMode) {
      console.log('🔥 Starting hot lead analysis...');
      
      // Prepare conversation history for hot lead analysis
      const conversationForAnalysis = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      hotLeadAnalysis = await analyzeHotLead(message, conversationForAnalysis);
    }

    // Create AI response message in database
    let aiMessage;
    try {
      aiMessage = await createMessage({
        conversation_id: conversation.id,
        customer_id: aiConfig.customer_id,
        content: aiResponse,
        sender_type: 'ai',
        model_used: aiConfig.model,
        hot_lead_score: hotLeadAnalysis?.score || 0,
        processing_time_ms: processingTime
      });
    } catch (dbError) {
      console.error('Error creating AI message:', dbError);
      // Continue without storing message if this fails
    }

    // Send alert if hot lead detected
    if (hotLeadAnalysis?.isHotLead && !testMode && aiMessage) {
      console.log('🚨 Hot lead detected! Attempting to send alert...');
      alertSent = await sendHotLeadAlert(
        hotLeadAnalysis, 
        message, 
        aiConfig, 
        conversation.id,
        aiMessage.id
      );
    }

    // Update conversation to mark lead as captured if not already done and not in test mode
    if (!conversation.lead_captured && !testMode) {
      try {
        const client = await getDbClient();
        await client.query(`
          UPDATE conversations 
          SET lead_captured = true, 
              lead_source = 'web_chat', 
              hot_lead_score = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [hotLeadAnalysis?.score || 0, conversation.id]);
        
        console.log('📝 Lead captured for conversation:', conversation.id);
      } catch (updateError) {
        console.error('Error updating conversation lead status:', updateError);
      }
    }

    // Return response with hot lead analysis
    return NextResponse.json({
      response: aiResponse,
      isAI: true,
      model: aiConfig.model,
      usage: completion.usage,
      smsMode: smsMode,
      hotLeadAnalysis: hotLeadAnalysis,
      alertSent: alertSent,
      conversationId: conversationId,
      processingTime: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Determine if this is an OpenAI API error
    const isOpenAIError = error.message?.includes('OpenAI') || error.status === 401;
    
    let errorResponse = "I'm having some technical difficulties right now. Please try again in a moment.";
    
    if (isOpenAIError) {
      errorResponse = "I'm experiencing connectivity issues with my AI service. Please try again shortly.";
    }

    return NextResponse.json({
      response: errorResponse,
      isAI: false,
      error: error.message,
      errorType: isOpenAIError ? 'openai_error' : 'general_error',
      debug: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// GET endpoint for retrieving AI configuration and conversation statistics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config') || 'default';
    const customerId = parseInt(searchParams.get('customerId')) || 1;
    const action = searchParams.get('action');

    if (action === 'test-connection') {
      // Test OpenAI connection
      if (!openai) {
        return NextResponse.json({
          connected: false,
          error: 'OpenAI client not initialized',
          hasApiKey: !!process.env.OPENAI_API_KEY
        });
      }

      try {
        const testCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        });

        return NextResponse.json({
          connected: true,
          model: 'gpt-4o-mini',
          usage: testCompletion.usage,
          timestamp: new Date().toISOString()
        });
      } catch (testError) {
        return NextResponse.json({
          connected: false,
          error: testError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (action === 'conversations') {
      // Return conversation statistics from database
      try {
        const client = await getDbClient();
        
        // Get conversation stats
        const conversationStats = await client.query(`
          SELECT COUNT(*) as total_conversations,
                 COUNT(CASE WHEN lead_captured = true THEN 1 END) as leads_generated
          FROM conversations 
          WHERE customer_id = $1 AND source = 'web_chat'
        `, [customerId]);

        // Get message stats
        const messageStats = await client.query(`
          SELECT COUNT(*) as total_messages,
                 AVG(hot_lead_score) as avg_lead_score
          FROM messages 
          WHERE customer_id = $1 AND sender_type = 'ai'
        `, [customerId]);

        // Get recent conversations
        const recentConversations = await client.query(`
          SELECT c.*, 
                 (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
          FROM conversations c
          WHERE c.customer_id = $1 AND c.source = 'web_chat'
          ORDER BY c.created_at DESC 
          LIMIT 10
        `, [customerId]);

        return NextResponse.json({
          totalConversations: parseInt(conversationStats.rows[0].total_conversations) || 0,
          totalMessages: parseInt(messageStats.rows[0].total_messages) || 0,
          leadsGenerated: parseInt(conversationStats.rows[0].leads_generated) || 0,
          avgLeadScore: parseFloat(messageStats.rows[0].avg_lead_score) || 0,
          conversations: recentConversations.rows
        });
      } catch (dbError) {
        console.error('Database query error:', dbError);
        return NextResponse.json({
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          conversations: []
        });
      }
    }

    // Return current AI configuration
    const config = await getAIConfig(configId, customerId);
    
    return NextResponse.json({
      success: true,
      config: config,
      openaiStatus: {
        connected: !!openai,
        hasApiKey: !!process.env.OPENAI_API_KEY
      },
      databaseStatus: {
        connected: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Chat GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
