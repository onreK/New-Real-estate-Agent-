import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { initializeDatabase } from '../../../lib/database.js';

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

// Test database connection using same pattern as setup-database
async function testDatabaseConnection() {
  try {
    console.log('🗄️ Testing database connection...');
    const result = await initializeDatabase();
    console.log('✅ Database connection successful:', result.message);
    return { success: true, client: result.client };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message };
  }
}

// Store conversation in database or memory
async function storeConversation(conversationId, message, response, isHotLead, hotLeadScore) {
  const dbResult = await testDatabaseConnection();
  
  if (dbResult.success) {
    try {
      const client = dbResult.client;
      
      // Store in database
      await client.query(`
        INSERT INTO conversations (customer_id, conversation_key, source, lead_captured, hot_lead_score)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (conversation_key) DO UPDATE SET
          hot_lead_score = GREATEST(conversations.hot_lead_score, $5),
          lead_captured = conversations.lead_captured OR $4,
          updated_at = CURRENT_TIMESTAMP
      `, [1, conversationId, 'web_chat', isHotLead, hotLeadScore]);

      // Get conversation ID
      const convResult = await client.query(`
        SELECT id FROM conversations WHERE conversation_key = $1
      `, [conversationId]);
      
      const convId = convResult.rows[0]?.id;

      if (convId) {
        // Store user message
        await client.query(`
          INSERT INTO messages (conversation_id, customer_id, content, sender_type, hot_lead_score)
          VALUES ($1, $2, $3, $4, $5)
        `, [convId, 1, message, 'user', hotLeadScore]);

        // Store AI response
        await client.query(`
          INSERT INTO messages (conversation_id, customer_id, content, sender_type, model_used, hot_lead_score)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [convId, 1, response, 'ai', defaultConfig.model, hotLeadScore]);

        // Store hot lead alert if applicable
        if (isHotLead) {
          await client.query(`
            INSERT INTO hot_lead_alerts (customer_id, conversation_id, lead_score, lead_phone, message_content, source)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [1, convId, hotLeadScore, 'Web Visitor', message, 'web_chat']);
        }
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

// GET endpoint for stats
export async function GET(request) {
  try {
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus.success) {
      try {
        const client = dbStatus.client;
        
        const stats = await client.query(`
          SELECT 
            COUNT(DISTINCT conversation_key) as total_conversations,
            COUNT(CASE WHEN lead_captured = true THEN 1 END) as leads_generated,
            COUNT(*) as total_messages
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
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
          stats: {
            totalConversations: parseInt(stats.rows[0]?.total_conversations) || 0,
            leadsGenerated: parseInt(stats.rows[0]?.leads_generated) || 0,
            totalMessages: parseInt(stats.rows[0]?.total_messages) || 0,
            hotLeads: parseInt(hotLeads.rows[0]?.hot_leads_count) || 0
          }
        });
      } catch (dbError) {
        console.error('Database query error:', dbError);
      }
    }

    // Fallback to memory stats
    return NextResponse.json({
      success: true,
      databaseConnected: false,
      stats: {
        totalConversations: memoryStorage.conversations.size,
        leadsGenerated: memoryStorage.hotLeads.length,
        totalMessages: Array.from(memoryStorage.conversations.values())
          .reduce((total, conv) => total + conv.messages.length, 0),
        hotLeads: memoryStorage.hotLeads.length
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
