// app/api/instagram/webhook/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import OpenAI from 'openai';
import { getInstagramConfigByPageId } from '../../../../lib/instagram-config.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Webhook verification for Instagram
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('📸 Instagram webhook verification:', { mode, token });

    if (mode === 'subscribe' && token === 'verify_bizzy_bot_ai') {
      console.log('✅ Instagram webhook verified');
      return new Response(challenge, { status: 200 });
    } else {
      console.log('❌ Instagram webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  } catch (error) {
    console.error('❌ Instagram webhook verification error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Handle Instagram webhook messages
export async function POST(request) {
  try {
    console.log('📸 Instagram webhook received');

    // Get the body as text for signature verification
    const body = await request.text();
    
    // Verify webhook signature if Instagram app secret is configured
    if (process.env.INSTAGRAM_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!verifySignature(body, signature)) {
        console.log('❌ Invalid Instagram webhook signature');
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      console.log('⚠️ Instagram app secret not configured, skipping signature verification');
    }

    const webhookData = JSON.parse(body);
    console.log('📸 Instagram webhook data received');

    // Process Instagram messages
    if (webhookData.object === 'instagram') {
      for (const entry of webhookData.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await processInstagramMessage(messagingEvent);
          }
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Instagram webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function processInstagramMessage(messagingEvent) {
  try {
    const { sender, recipient, message } = messagingEvent;
    
    if (!message || !message.text) {
      console.log('📸 Ignoring non-text Instagram message');
      return;
    }

    console.log('📸 Processing Instagram message:', {
      from: sender.id,
      to: recipient.id,
      text: message.text
    });

    // Find configuration for this Instagram page
    const pageConfig = getInstagramConfigByPageId(recipient.id);
    
    if (!pageConfig) {
      console.log('❌ No configuration found for Instagram page:', recipient.id);
      return;
    }

    // Generate AI response
    const aiResponse = await generateInstagramResponse(message.text, pageConfig);
    
    if (!aiResponse) {
      console.log('❌ Failed to generate Instagram AI response');
      return;
    }

    // Send response back to Instagram
    const sendResult = await sendInstagramMessage(sender.id, aiResponse, pageConfig.accessToken);
    
    if (sendResult) {
      console.log('✅ Instagram message processed successfully');
    } else {
      console.log('❌ Failed to send Instagram response');
    }

  } catch (error) {
    console.error('❌ Error processing Instagram message:', error);
  }
}

async function generateInstagramResponse(messageText, config) {
  if (!openai) {
    return "Thanks for your message! We'll get back to you soon.";
  }

  try {
    const systemPrompt = `You are an AI assistant for ${config.businessName} responding to Instagram direct messages.

Personality: ${config.personality}
Business: ${config.businessName}

Guidelines:
- Keep responses under 160 characters for Instagram
- Be ${config.personality} and helpful
- Focus on ${config.businessName}
- Encourage engagement and provide value
- For complex inquiries, offer to connect them with a human representative

Instagram Message: "${messageText}"`;

    const completion = await openai.chat.completions.create({
      model: config.aiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageText }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return completion.choices[0].message.content.trim();

  } catch (error) {
    console.error('❌ Instagram AI response error:', error);
    return "Thanks for your message! I'm experiencing some technical difficulties right now, but someone will get back to you soon.";
  }
}

async function sendInstagramMessage(recipientId, message, accessToken) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to send Instagram message:', errorData);
      return false;
    }

    console.log('✅ Instagram message sent successfully');
    return true;

  } catch (error) {
    console.error('❌ Error sending Instagram message:', error);
    return false;
  }
}

function verifySignature(body, signature) {
  if (!signature || !process.env.INSTAGRAM_APP_SECRET) {
    return false;
  }

  try {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}
