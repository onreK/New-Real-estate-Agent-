// app/api/facebook/webhook/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// In-memory storage for conversations and customer configs (use database in production)
const conversations = new Map();
const customerConfigs = new Map();

// Verify webhook signature
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

// Send message via Facebook Messenger
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

// Generate AI response
async function generateAIResponse(messageText, customerConfig, conversationHistory = []) {
  if (!openai) {
    return "I'm having a brief technical issue, but I'd be happy to help you. Please try again in a moment.";
  }

  try {
    const businessName = customerConfig.businessName || 'My Business';
    const personality = customerConfig.personality || 'professional';
    const industry = customerConfig.industry || 'General Business';
    
    const systemPrompt = `You are an AI assistant representing ${businessName} via Facebook Messenger.

Business Details:
- Name: ${businessName}
- Industry: ${industry}
- Personality: ${personality}

Guidelines:
- Keep responses concise (under 160 characters when possible) for Messenger
- Be ${personality} and helpful
- If you can't answer something, offer to connect them with a human
- Use emojis sparingly but appropriately for Messenger
- Ask clarifying questions to better assist them
- Focus on ${industry} expertise
${customerConfig.welcomeMessage ? `- Welcome message: ${customerConfig.welcomeMessage}` : ''}

Previous conversation:
${conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageText }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ AI Generation Error:', error);
    return "I'm having a brief technical issue, but I'd be happy to help you. Please try again in a moment.";
  }
}

// Hot lead analysis
async function analyzeHotLead(messageContent, conversationHistory = []) {
  if (!openai) {
    return { isHotLead: false, score: 0, reasoning: 'OpenAI not configured' };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a hot lead detection AI for Facebook Messenger conversations. Analyze if this customer is ready to buy/engage.

Hot lead indicators:
- Ready to purchase/book/schedule
- Asking about pricing, availability, timeline
- Expressing urgency ("need this soon", "ASAP")
- Providing contact information
- Asking to speak with someone
- Specific product/service inquiries

Score 0-10 (10 = extremely hot lead ready to buy)
Respond with JSON: {"score": X, "reasoning": "brief explanation"}`
        },
        {
          role: "user",
          content: `Current message: "${messageContent}"\n\nConversation history:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}`
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content.trim();
    const hotLeadData = JSON.parse(response);
    
    return {
      isHotLead: hotLeadData.score >= 7,
      score: hotLeadData.score,
      reasoning: hotLeadData.reasoning
    };
  } catch (error) {
    console.error('❌ Hot Lead Analysis Error:', error);
    return { isHotLead: false, score: 0, reasoning: 'Analysis failed' };
  }
}

// GET endpoint for webhook verification
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

// POST endpoint for receiving messages
export async function POST(request) {
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

    // Analyze for hot leads
    const conversationHistory = conversation.messages.slice(-5); // Last 5 messages
    const hotLeadAnalysis = await analyzeHotLead(messageText, conversationHistory);

    // Generate AI response
    let aiResponse;
    if (conversation.messages.length === 1) {
      // First message - use welcome message
      aiResponse = customerConfig.welcomeMessage;
    } else {
      aiResponse = await generateAIResponse(messageText, customerConfig, conversationHistory);
    }

    // Add AI response to conversation
    conversation.messages.push({
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      hotLeadScore: hotLeadAnalysis.score
    });

    // Update conversation
    conversation.lastMessageAt = new Date().toISOString();
    conversations.set(conversationKey, conversation);

    // Send AI response via Facebook
    try {
      await sendFacebookMessage(senderId, aiResponse);
      console.log('✅ Facebook AI response sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Facebook response:', error);
    }

    // Log hot lead if detected
    if (hotLeadAnalysis.isHotLead) {
      console.log('🔥 HOT LEAD DETECTED on Facebook:', {
        senderId,
        score: hotLeadAnalysis.score,
        reasoning: hotLeadAnalysis.reasoning,
        message: messageText.substring(0, 100)
      });
      
      // TODO: Send notification to business owner
      // You can integrate this with your existing hot lead notification system
    }

    console.log('✅ Facebook message processed successfully:', {
      conversationId: conversationKey,
      messageCount: conversation.messages.length,
      hotLeadScore: hotLeadAnalysis.score
    });
  }

  // Handle postbacks (button clicks, etc.)
  if (event.postback) {
    console.log('📱 Facebook Postback received:', event.postback);
    // Handle button clicks or quick replies here
  }
}
