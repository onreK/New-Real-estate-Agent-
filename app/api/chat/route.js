import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { getAIConfigForUser } from '../ai-config/route.js';

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

    // Get user's AI configuration from database
    console.log('🔍 Loading AI configuration for user:', userId);
    const aiConfig = await getAIConfigForUser(userId);
    console.log('✅ AI Configuration loaded:', {
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      hasCustomPrompt: !!aiConfig.systemPrompt
    });

    // Check for hot lead keywords
    const messageContent = userMessage.content.toLowerCase();
    const isHotLead = HOT_LEAD_KEYWORDS.some(keyword => 
      messageContent.includes(keyword.toLowerCase())
    );

    // Build system prompt using user's configuration
    let systemPrompt = aiConfig.systemPrompt;

    // If no custom system prompt, use a default
    if (!systemPrompt || systemPrompt.trim() === 'You are a helpful AI assistant.') {
      systemPrompt = `You are a professional AI assistant for a real estate business. 
You help customers with all their real estate needs including buying, selling, and renting properties.

Be helpful, professional, and knowledgeable about real estate.
Always aim to capture leads and schedule appointments when appropriate.`;
    }

    // Add hot lead context if detected
    if (isHotLead) {
      systemPrompt += `\n\nIMPORTANT: This customer has expressed hot lead indicators. Be extra attentive and helpful, and try to capture their contact information or schedule a meeting.`;
    }

    console.log('🎯 Using system prompt:', systemPrompt.substring(0, 100) + '...');

    // Save conversation to database if available
    if (dbAvailable && conversationKey) {
      try {
        // Create or get conversation
        const conversationResult = await db.query(
          `INSERT INTO conversations (user_id, type, status) 
           VALUES ($1, 'chat', 'active') 
           ON CONFLICT DO NOTHING 
           RETURNING id`,
          [userId]
        );

        let conversationId = conversationResult.rows[0]?.id;
        
        if (!conversationId) {
          // Get existing conversation
          const existingConv = await db.query(
            'SELECT id FROM conversations WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, 'chat']
          );
          conversationId = existingConv.rows[0]?.id;
        }

        // Save user message
        if (conversationId) {
          await db.query(
            'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3)',
            [conversationId, 'user', userMessage.content]
          );
        }

        console.log('💾 Conversation saved to database');
      } catch (dbError) {
        console.error('⚠️ Database error (continuing anyway):', dbError);
      }
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role || (msg.sender === 'assistant' ? 'assistant' : 'user'),
        content: msg.content
      }))
    ];

    console.log('🤖 Calling OpenAI with config:', {
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      messages_count: openaiMessages.length
    });

    // Call OpenAI with user's configuration
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: openaiMessages,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
    });

    const assistantMessage = completion.choices[0].message.content;
    console.log('✅ OpenAI response received:', assistantMessage.substring(0, 100) + '...');

    // Save assistant response to database if available
    if (dbAvailable && conversationKey) {
      try {
        const conversationResult = await db.query(
          'SELECT id FROM conversations WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
          [userId, 'chat']
        );
        
        const conversationId = conversationResult.rows[0]?.id;
        if (conversationId) {
          await db.query(
            'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3)',
            [conversationId, 'assistant', assistantMessage]
          );
        }
      } catch (dbError) {
        console.error('⚠️ Database error saving response:', dbError);
      }
    }

    // Handle hot lead detection
    if (isHotLead && dbAvailable && aiConfig.leadDetectionEnabled) {
      try {
        // Create hot lead entry
        await db.query(
          `INSERT INTO hot_leads (user_id, urgency_score, keywords, ai_analysis, status) 
           VALUES ($1, $2, $3, $4, 'new')`,
          [
            userId,
            8, // High urgency score for detected keywords
            HOT_LEAD_KEYWORDS.filter(keyword => messageContent.includes(keyword.toLowerCase())),
            `Hot lead detected from chat. Keywords found: ${HOT_LEAD_KEYWORDS.filter(keyword => messageContent.includes(keyword.toLowerCase())).join(', ')}`
          ]
        );
        console.log('🔥 Hot lead logged to database');
      } catch (dbError) {
        console.error('⚠️ Error logging hot lead:', dbError);
      }
    }

    console.log('✅ Chat response completed successfully');

    return NextResponse.json({ 
      response: assistantMessage,
      isHotLead,
      model: aiConfig.model,
      configApplied: true
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Return a helpful error message
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error.message,
      fallbackResponse: "I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment."
    }, { status: 500 });
  }
}
