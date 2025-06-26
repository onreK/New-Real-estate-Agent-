import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  getDbClient,
  createConversation,
  getConversationByKey,
  createMessage,
  createHotLeadAlert,
  getConversationMessages
} from '../../../lib/database.js';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// In-memory storage for conversations (fallback)
const memoryStorage = {
  conversations: new Map(),
  messages: new Map(),
  hotLeads: []
};

// Default AI configuration
const defaultConfig = {
  businessName: 'Test Real Estate Co',
  personality: 'professional',
  businessInfo: `We are a full-service real estate company specializing in:
• Residential home sales and purchases
• Commercial property investments  
• Property management services
• First-time buyer assistance
• Market analysis and valuations

Our experienced agents help clients navigate the real estate market with personalized service and local expertise.`,
  model: 'gpt-4o-mini',
  creativity: 0.7,
  welcomeMessage: 'Hi! I\'m the AI assistant for Test Real Estate Co. How can I help you with your real estate needs today?',
  enableHotLeadAlerts: true
};

// Test database connection using proper method
async function testDatabaseConnection() {
  try {
    console.log('🗄️ Testing database connection...');
    const client = await getDbClient();
    console.log('✅ Database connection successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message };
  }
}

// Store conversation using proper database functions
async function storeConversation(conversationId, message, response, isHotLead, hotLeadScore) {
  const dbStatus = await testDatabaseConnection();
  
  if (dbStatus.success) {
    try {
      console.log('💾 Storing conversation in database...');
      
      // Get or create conversation using helper function
      let conversation = await getConversationByKey(conversationId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await createConversation({
          customer_id: 1, // Default demo customer
          conversation_key: conversationId,
          source: 'web_chat',
          visitor_info: {
            userAgent: 'Web Chat User',
            timestamp: new Date().toISOString()
          }
        });
        console.log('📝 Created new conversation:', conversation.id);
      }

      // Create user message
      const userMessage = await createMessage({
        conversation_id: conversation.id,
        customer_id: 1,
        content: message,
        sender_type: 'user',
        hot_lead_score: hotLeadScore
      });

      // Create AI response message
      const aiMessage = await createMessage({
        conversation_id: conversation.id,
        customer_id: 1,
        content: response,
        sender_type: 'ai',
        model_used: defaultConfig.model,
        hot_lead_score: hotLeadScore
      });

      // Create hot lead alert if applicable
      if (isHotLead) {
        await createHotLeadAlert({
          customer_id: 1,
          conversation_id: conversation.id,
          message_id: aiMessage.id,
          business_owner_phone: 'Web Visitor',
          lead_score: hotLeadScore,
          lead_phone: 'Web Visitor',
          message_content: message,
          ai_reasoning: `High interest detected with score: ${hotLeadScore}`,
          next_action: 'Contact customer immediately',
          urgency: hotLeadScore >= 80 ? 'high' : 'medium',
          source: 'web_chat'
        });
        console.log('🔥 Hot lead alert created successfully');
      }

      // Update conversation to mark lead as captured
      if (isHotLead) {
        const client = await getDbClient();
        await client.query(`
          UPDATE conversations 
          SET lead_captured = true, 
              lead_source = 'web_chat', 
              hot_lead_score = GREATEST(hot_lead_score, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [hotLeadScore, conversation.id]);
      }

      console.log('✅ Successfully stored conversation in database');
      return { success: true, storage: 'database' };
    } catch (dbError) {
      console.error('❌ Database storage error:', dbError);
      // Fall through to memory storage
    }
  }

  // Fallback to memory storage
  try {
    const conversation = {
      id: conversationId,
      messages: [
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      ],
      isHotLead,
      hotLeadScore,
      timestamp: new Date()
    };

    memoryStorage.conversations.set(conversationId, conversation);

    if (isHotLead) {
      memoryStorage.hotLeads.push({
        conversationId,
        message,
        score: hotLeadScore,
        timestamp: new Date()
      });
    }

    console.log('✅ Successfully stored conversation in memory');
    return { success: true, storage: 'memory' };
  } catch (memError) {
    console.error('❌ Memory storage error:', memError);
    return { success: false, storage: 'failed' };
  }
}

// Detect hot leads
function detectHotLead(message) {
  const hotKeywords = [
    'buy', 'purchase', 'buying', 'interested in buying',
    'looking for', 'need', 'want', 'ready to',
    'today', 'now', 'immediately', 'asap',
    'budget', 'price range', 'afford',
    'house', 'home', 'property', 'condo', 'townhouse',
    'schedule', 'appointment', 'meeting', 'show', 'viewing',
    'agent', 'realtor', 'call me', 'contact',
    'urgent', 'time sensitive', 'quickly'
  ];

  const urgentPhrases = [
    'i want to buy', 'looking to buy', 'ready to purchase',
    'need to find', 'house today', 'home today',
    'call me', 'schedule', 'appointment'
  ];

  const messageLower = message.toLowerCase();
  let score = 0;
  let matchedKeywords = [];

  // Check for urgent phrases (higher score)
  urgentPhrases.forEach(phrase => {
    if (messageLower.includes(phrase)) {
      score += 30;
      matchedKeywords.push(phrase);
    }
  });

  // Check for individual keywords
  hotKeywords.forEach(keyword => {
    if (messageLower.includes(keyword)) {
      score += 10;
      matchedKeywords.push(keyword);
    }
  });

  // Additional scoring for multiple indicators
  if (matchedKeywords.length > 3) score += 20;
  if (messageLower.includes('today') || messageLower.includes('now')) score += 15;

  const isHotLead = score >= 40;
  const urgency = score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

  return {
    isHotLead,
    score: Math.min(score, 100),
    matchedKeywords,
    urgency,
    reasoning: isHotLead ? 
      `High interest detected with keywords: ${matchedKeywords.slice(0, 3).join(', ')}` :
      'Standard inquiry'
  };
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    console.log('💬 Chat API called at:', new Date().toISOString());
    
    const body = await request.json();
    const { 
      message, 
      conversationId = 'web_chat_' + Date.now(),
      testMode = false 
    } = body;

    console.log('📝 Chat request:', {
      messageLength: message?.length || 0,
      conversationId,
      testMode,
      messagePreview: message?.slice(0, 50) + '...'
    });

    // Validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string'
      }, { status: 400 });
    }

    // Test database connection
    const dbStatus = await testDatabaseConnection();
    console.log('🗄️ Database status:', dbStatus.success ? 'Connected' : 'Using memory fallback');

    // OpenAI check
    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return NextResponse.json({
        response: "I'm experiencing some technical difficulties. Please try again in a moment.",
        isAI: false,
        error: 'OpenAI not configured'
      }, { status: 500 });
    }

    // Detect hot lead
    const hotLeadAnalysis = detectHotLead(message);
    console.log('🔥 Hot lead analysis:', hotLeadAnalysis);

    // Build system prompt
    const systemPrompt = `You are an AI assistant for ${defaultConfig.businessName} with a ${defaultConfig.personality} personality.

Business Information:
${defaultConfig.businessInfo}

Key Instructions:
- Be helpful, professional, and knowledgeable about real estate
- Focus on helping with real estate needs and questions
- If someone shows buying interest, be enthusiastic and helpful
- For scheduling or specific requests, offer to connect them with a human representative
- Provide valuable information about our services

Keep responses conversational and helpful.`;

    console.log('🤖 Calling OpenAI...');

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: defaultConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: defaultConfig.creativity
    });

    const aiResponse = completion.choices[0].message.content.trim();
    const processingTime = Date.now() - startTime;

    console.log('✅ AI response generated:', {
      length: aiResponse.length,
      model: defaultConfig.model,
      processingTime: processingTime + 'ms'
    });

    // Store conversation (database or memory)
    if (!testMode) {
      const storageResult = await storeConversation(
        conversationId, 
        message, 
        aiResponse, 
        hotLeadAnalysis.isHotLead, 
        hotLeadAnalysis.score
      );
      console.log('💾 Storage result:', storageResult);
    }

    // Return response
    return NextResponse.json({
      response: aiResponse,
      isAI: true,
      model: defaultConfig.model,
      hotLeadAnalysis: hotLeadAnalysis,
      conversationId: conversationId,
      processingTime: processingTime,
      databaseConnected: dbStatus.success,
      storageUsed: dbStatus.success ? 'database' : 'memory',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    return NextResponse.json({
      response: "I'm having some technical difficulties right now. Please try again in a moment.",
      isAI: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for dashboard data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('📊 Dashboard API called with action:', action);

    // Handle test-connection action
    if (action === 'test-connection') {
      console.log('🧪 Testing OpenAI connection...');
      
      if (!openai) {
        return NextResponse.json({
          connected: false,
          error: 'OpenAI client not initialized',
          hasApiKey: !!process.env.OPENAI_API_KEY
        });
      }

      try {
        // Test OpenAI with a simple completion
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
        console.error('OpenAI connection test failed:', testError);
        return NextResponse.json({
          connected: false,
          error: testError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Handle conversations action
    if (action === 'conversations') {
      console.log('📋 Getting conversation data...');
      
      const dbStatus = await testDatabaseConnection();
      
      if (dbStatus.success) {
        try {
          const client = await getDbClient();
          
          // Get conversation stats
          const conversationStats = await client.query(`
            SELECT 
              COUNT(DISTINCT c.id) as total_conversations,
              COUNT(CASE WHEN c.lead_captured = true THEN 1 END) as leads_generated,
              COALESCE(SUM(message_counts.msg_count), 0) as total_messages
            FROM conversations c
            LEFT JOIN (
              SELECT conversation_id, COUNT(*) as msg_count 
              FROM messages 
              WHERE customer_id = 1 
              GROUP BY conversation_id
            ) message_counts ON c.id = message_counts.conversation_id
            WHERE c.customer_id = 1 AND c.source = 'web_chat'
          `);

          // Get recent conversations with details
          const recentConversations = await client.query(`
            SELECT 
              c.id,
              c.conversation_key,
              c.source,
              c.lead_captured,
              c.hot_lead_score,
              c.created_at,
              c.updated_at,
              COUNT(m.id) as message_count,
              MAX(m.created_at) as last_message_at
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.customer_id = 1 AND c.source = 'web_chat'
            GROUP BY c.id, c.conversation_key, c.source, c.lead_captured, c.hot_lead_score, c.created_at, c.updated_at
            ORDER BY c.updated_at DESC
            LIMIT 10
          `);

          // Get hot lead alerts
          const hotLeadAlerts = await client.query(`
            SELECT 
              h.*,
              c.conversation_key
            FROM hot_lead_alerts h
            LEFT JOIN conversations c ON h.conversation_id = c.id
            WHERE h.customer_id = 1
            ORDER BY h.created_at DESC
            LIMIT 10
          `);

          const stats = conversationStats.rows[0];
          
          console.log('✅ Database conversation data retrieved:', {
            totalConversations: stats.total_conversations,
            totalMessages: stats.total_messages,
            leadsGenerated: stats.leads_generated,
            hotLeadAlerts: hotLeadAlerts.rows.length
          });

          return NextResponse.json({
            totalConversations: parseInt(stats.total_conversations) || 0,
            totalMessages: parseInt(stats.total_messages) || 0,
            leadsGenerated: parseInt(stats.leads_generated) || 0,
            conversations: recentConversations.rows.map(conv => ({
              id: conv.id,
              conversationKey: conv.conversation_key,
              source: conv.source,
              leadCaptured: conv.lead_captured,
              hotLeadScore: conv.hot_lead_score,
              messageCount: parseInt(conv.message_count) || 0,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              lastMessageAt: conv.last_message_at
            })),
            hotLeadAlerts: hotLeadAlerts.rows.map(alert => ({
              id: alert.id,
              conversationId: alert.conversation_id,
              conversationKey: alert.conversation_key,
              leadScore: alert.lead_score,
              messageContent: alert.message_content,
              reasoning: alert.ai_reasoning,
              urgency: alert.urgency,
              createdAt: alert.created_at
            })),
            databaseConnected: true
          });

        } catch (dbError) {
          console.error('Database conversation query error:', dbError);
          // Fall through to memory fallback
        }
      }

      // Fallback to memory storage
      console.log('📝 Using memory storage fallback');
      return NextResponse.json({
        totalConversations: memoryStorage.conversations.size,
        totalMessages: Array.from(memoryStorage.conversations.values())
          .reduce((total, conv) => total + conv.messages.length, 0),
        leadsGenerated: memoryStorage.hotLeads.length,
        conversations: Array.from(memoryStorage.conversations.entries()).map(([key, conv]) => ({
          id: key,
          conversationKey: key,
          source: 'web_chat',
          leadCaptured: conv.isHotLead,
          hotLeadScore: conv.hotLeadScore,
          messageCount: conv.messages.length,
          createdAt: conv.timestamp,
          updatedAt: conv.timestamp
        })),
        hotLeadAlerts: memoryStorage.hotLeads.map((lead, index) => ({
          id: index,
          conversationId: lead.conversationId,
          leadScore: lead.score,
          messageContent: lead.message,
          createdAt: lead.timestamp
        })),
        databaseConnected: false
      });
    }

    // Default action - return basic stats
    console.log('📊 Getting basic stats...');
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus.success) {
      try {
        const client = await getDbClient();
        
        const stats = await client.query(`
          SELECT 
            COUNT(DISTINCT c.conversation_key) as total_conversations,
            COUNT(CASE WHEN c.lead_captured = true THEN 1 END) as leads_generated,
            COALESCE(SUM(message_counts.msg_count), 0) as total_messages
          FROM conversations c
          LEFT JOIN (
            SELECT conversation_id, COUNT(*) as msg_count 
            FROM messages 
            WHERE customer_id = 1 
            GROUP BY conversation_id
          ) message_counts ON c.id = message_counts.conversation_id
          WHERE c.customer_id = 1
        `);

        const hotLeads = await client.query(`
          SELECT COUNT(*) as hot_leads_count
          FROM hot_lead_alerts 
          WHERE customer_id = 1
        `);

        return NextResponse.json({
          success: true,
          databaseConnected: true,
          totalConversations: parseInt(stats.rows[0]?.total_conversations) || 0,
          leadsGenerated: parseInt(stats.rows[0]?.leads_generated) || 0,
          totalMessages: parseInt(stats.rows[0]?.total_messages) || 0,
          hotLeads: parseInt(hotLeads.rows[0]?.hot_leads_count) || 0
        });
      } catch (dbError) {
        console.error('Database basic stats error:', dbError);
      }
    }

    // Fallback to memory stats
    return NextResponse.json({
      success: true,
      databaseConnected: false,
      totalConversations: memoryStorage.conversations.size,
      leadsGenerated: memoryStorage.hotLeads.length,
      totalMessages: Array.from(memoryStorage.conversations.values())
        .reduce((total, conv) => total + conv.messages.length, 0),
      hotLeads: memoryStorage.hotLeads.length
    });

  } catch (error) {
    console.error('❌ Dashboard GET API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      databaseConnected: false
    }, { status: 500 });
  }
}
