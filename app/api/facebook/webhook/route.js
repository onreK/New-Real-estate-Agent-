// app/api/facebook/webhook/route.js - UPDATED TO USE CENTRALIZED AI SERVICE
import { NextResponse } from 'next/server';
import crypto from 'crypto';
// 🎯 IMPORT THE CENTRALIZED AI SERVICE
import { generateFacebookResponse } from '../../../lib/ai-service.js';

// In-memory storage for conversations and customer configs (use database in production)
const conversations = new Map();
const customerConfigs = new Map();

// Verify webhook signature (unchanged)
function verifySignature(payload, signature) {
  if (!process.env.FACEBOOK_APP_SECRET || !signature) {
    return true; // Skip verification in development if secret not set
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Send message via Facebook Messenger (unchanged)
async function sendFacebookMessage(recipientId, messageText) {
  if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.log('📨 Demo mode - would send:', messageText);
    return { message_id: 'demo_' + Date.now() };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: 'RESPONSE'
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Facebook Send Error:', result);
      throw new Error(result.error?.message || 'Failed to send message');
    }

    return result;
  } catch (error) {
    console.error('❌ Facebook Message Send Failed:', error);
    throw error;
  }
}

// GET endpoint for webhook verification (unchanged)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('🔍 Facebook Webhook Verification:', { mode, token });

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    console.log('✅ Facebook webhook verified successfully');
    return new Response(challenge, { status: 200 });
  } else {
    console.error('❌ Facebook webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }
}

// POST endpoint for receiving messages - UPDATED TO USE CENTRALIZED AI
export async function POST(request) {
  console.log('📘 === FACEBOOK WEBHOOK WITH CENTRALIZED AI SERVICE ===');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error('❌ Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);

    // Handle webhook entry
    if (data.object === 'page') {
      for (const entry of data.entry) {
        for (const webhook_event of entry.messaging) {
          await handleMessengerEvent(webhook_event);
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Facebook Webhook Error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleMessengerEvent(event) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id;

  // Handle messages
  if (event.message && event.message.text) {
    const messageText = event.message.text;
    const timestamp = event.timestamp;

    console.log('📨 Facebook Message received:', {
      from: senderId,
      text: messageText.substring(0, 50) + '...',
      timestamp: new Date(timestamp).toISOString()
    });

    // Get or create conversation
    const conversationKey = `fb_${senderId}_${recipientId}`;
    let conversation = conversations.get(conversationKey) || {
      id: conversationKey,
      platform: 'facebook',
      senderId,
      recipientId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messages: []
    };

    // Add incoming message to conversation
    conversation.messages.push({
      id: Date.now().toString(),
      text: messageText,
      sender: 'customer',
      timestamp: new Date(timestamp).toISOString(),
      direction: 'inbound'
    });

    // Get customer configuration (default for now, will be customer-specific later)
    const customerConfig = customerConfigs.get(recipientId) || {
      businessName: 'Your Business Name',
      industry: 'Your Industry',
      personality: 'professional',
      welcomeMessage: 'Hi! How can I help you today?'
    };

    // 🎯 USE CENTRALIZED AI SERVICE FOR FACEBOOK RESPONSE
    console.log('🧠 Using centralized AI service for Facebook...');
    
    // Build conversation history for context
    const conversationHistory = conversation.messages.slice(-5).map(msg => ({
      role: msg.sender === 'customer' ? 'user' : 'assistant',
      content: msg.text,
      sender_type: msg.sender === 'customer' ? 'user' : 'assistant'
    }));

    let aiResult;
    let aiResponse;
    
    if (conversation.messages.length === 1) {
      // First message - use centralized service but might override with welcome message
      aiResult = await generateFacebookResponse(
        recipientId, // pageId
        messageText, // user message
        conversationHistory // conversation history
      );
      
      // Use welcome message for first interaction if configured
      if (customerConfig.welcomeMessage) {
        aiResponse = customerConfig.welcomeMessage;
      } else {
        aiResponse = aiResult.success ? aiResult.response : "Hi! How can I help you today?";
      }
    } else {
      // Regular message - use centralized AI service
      aiResult = await generateFacebookResponse(
        recipientId, // pageId
        messageText, // user message
        conversationHistory // conversation history
      );
      
      if (aiResult.success) {
        aiResponse = aiResult.response;
      } else {
        console.error('❌ Centralized AI service failed:', aiResult.error);
        aiResponse = "I'm having a brief technical issue, but I'd be happy to help you. Please try again in a moment.";
      }
    }

    console.log('✅ Centralized AI service result:', {
      success: aiResult?.success || false,
      hotLead: aiResult?.hotLead?.isHotLead || false,
      score: aiResult?.hotLead?.score || 0,
      knowledgeBaseUsed: aiResult?.metadata?.knowledgeBaseUsed || false
    });

    // Add AI response to conversation
    conversation.messages.push({
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      hotLeadScore: aiResult?.hotLead?.score || 0,
      aiServiceUsed: aiResult?.success || false
    });

    // Update conversation
    conversation.lastMessageAt = new Date().toISOString();
    conversations.set(conversationKey, conversation);

    // Send AI response via Facebook
    try {
      await sendFacebookMessage(senderId, aiResponse);
      console.log('✅ Facebook AI response sent successfully with centralized service');
    } catch (error) {
      console.error('❌ Failed to send Facebook response:', error);
    }

    // Log hot lead if detected by centralized service
    if (aiResult?.hotLead?.isHotLead) {
      console.log('🔥 HOT LEAD DETECTED on Facebook (centralized AI):', {
        senderId,
        score: aiResult.hotLead.score,
        reasoning: aiResult.hotLead.reasoning,
        message: messageText.substring(0, 100),
        knowledgeBaseUsed: aiResult.metadata?.knowledgeBaseUsed,
        tokensUsed: aiResult.metadata?.tokensUsed
      });
      
      // TODO: Send notification to business owner
      // You can integrate this with your existing hot lead notification system
    }

    console.log('✅ Facebook message processed successfully with centralized AI:', {
      conversationId: conversationKey,
      messageCount: conversation.messages.length,
      hotLeadScore: aiResult?.hotLead?.score || 0,
      centralizedAI: aiResult?.success || false,
      tokensUsed: aiResult?.metadata?.tokensUsed || 0,
      knowledgeBaseUsed: aiResult?.metadata?.knowledgeBaseUsed || false
    });
  }

  // Handle postbacks (button clicks, etc.)
  if (event.postback) {
    console.log('📱 Facebook Postback received:', event.postback);
    // Handle button clicks or quick replies here
  }
}
