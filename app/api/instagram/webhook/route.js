// app/api/instagram/webhook/route.js
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
  if (!process.env.INSTAGRAM_APP_SECRET || !signature) {
    return true; // Skip verification in development if secret not set
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Send message via Instagram
async function sendInstagramMessage(recipientId, messageText) {
  if (!process.env.INSTAGRAM_PAGE_ACCESS_TOKEN) {
    console.log('📨 Demo mode - would send Instagram message:', messageText);
    return { message_id: 'demo_' + Date.now() };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: 'RESPONSE'
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Instagram Send Error:', result);
      throw new Error(result.error?.message || 'Failed to send Instagram message');
    }

    return result;
  } catch (error) {
    console.error('❌ Instagram Message Send Failed:', error);
    throw error;
  }
}

// Generate AI response for Instagram
async function generateAIResponse(messageText, customerConfig, conversationHistory = []) {
  if (!openai) {
    return "I'm having a brief technical issue, but I'd be happy to help you. Please try again in a moment.";
  }

  try {
    const businessName = customerConfig.businessName || 'My Business';
    const personality = customerConfig.personality || 'professional';
    const industry = customerConfig.industry || 'General Business';
    
    const systemPrompt = `You are an AI assistant representing ${businessName} via Instagram Direct Messages.

Business Details:
- Name: ${businessName}
- Industry: ${industry}
- Personality: ${personality}

Guidelines:
- Keep responses concise (under 160 characters when possible) for Instagram DMs
- Be ${personality} and helpful
- If you can't answer something, offer to connect them with a human
- Use emojis appropriately for Instagram (more casual than email)
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

// Hot lead analysis for Instagram
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
          content: `You are a hot lead detection AI for Instagram Direct Message conversations. Analyze if this customer is ready to buy/engage.

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

  console.log('🔍 Instagram Webhook Verification:', { mode, token });

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified successfully');
    return new Response(challenge, { status: 200 });
  } else {
    console.error('❌ Instagram webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }
}

// POST endpoint for receiving Instagram messages
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error('❌ Invalid Instagram webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);

    // Handle webhook entry for Instagram
    if (data.object === 'instagram') {
      for (const entry of data.entry) {
        for (const webhook_event of entry.messaging) {
          await handleInstagramEvent(webhook_event);
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Instagram Webhook Error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleInstagramEvent(event) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id;

  // Handle Instagram messages
  if (event.message && event.message.text) {
    const messageText = event.message.text;
    const timestamp = event.timestamp;

    console.log('📨 Instagram Message received:', {
      from: senderId,
      text: messageText.substring(0, 50) + '...',
      timestamp: new Date(timestamp).toISOString()
    });

    // Get or create conversation
    const conversationKey = `ig_${senderId}_${recipientId}`;
    let conversation = conversations.get(conversationKey) || {
      id: conversationKey,
      platform: 'instagram',
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
      personality: 'friendly',
      welcomeMessage: 'Hi! Thanks for reaching out on Instagram! 📸 How can I help you today?'
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

    // Send AI response via Instagram
    try {
      await sendInstagramMessage(senderId, aiResponse);
      console.log('✅ Instagram AI response sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Instagram response:', error);
    }

    // Log hot lead if detected
    if (hotLeadAnalysis.isHotLead) {
      console.log('🔥 HOT LEAD DETECTED on Instagram:', {
        senderId,
        score: hotLeadAnalysis.score,
        reasoning: hotLeadAnalysis.reasoning,
        message: messageText.substring(0, 100)
      });
      
      // TODO: Send notification to business owner
    }

    console.log('✅ Instagram message processed successfully:', {
      conversationId: conversationKey,
      messageCount: conversation.messages.length,
      hotLeadScore: hotLeadAnalysis.score
    });
  }

  // Handle Instagram story mentions/reactions
  if (event.message && (event.message.story || event.message.reply_to)) {
    console.log('📱 Instagram Story interaction received:', event.message);
    // Handle story mentions/replies here if needed
  }
}
