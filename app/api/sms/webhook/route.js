import { NextResponse } from 'next/server';
import twilio from 'twilio';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory storage for conversations and customer configs
const conversations = new Map();
const customerConfigs = new Map();

// Hot lead scoring function
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
          content: `You are a hot lead detection AI. Analyze the customer message and conversation history to determine if this is a hot lead (someone ready to buy/engage).

Score from 0-10 where:
- 0-3: Just browsing, low intent
- 4-6: Interested, medium intent  
- 7-8: Strong interest, high intent
- 9-10: Ready to buy NOW, urgent intent

Look for:
🔥 HIGH INTENT (8-10): "want to buy", "ready to purchase", "budget is X", "call me", "need ASAP", "when can we meet"
🔥 MEDIUM INTENT (5-7): "interested in", "tell me more", "pricing", "available", "schedule"
🔥 LOW INTENT (1-4): "just looking", "browsing", "general info", "what are your hours"

Respond with JSON: {"score": number, "isHotLead": boolean, "reasoning": "brief explanation", "keywords": ["detected", "keywords"]}`
        },
        {
          role: "user",
          content: `Current message: "${messageContent}"\n\nConversation history: ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    return {
      isHotLead: analysis.score >= 7,
      score: analysis.score,
      reasoning: analysis.reasoning,
      keywords: analysis.keywords || []
    };
  } catch (error) {
    console.error('Hot lead analysis error:', error);
    return { isHotLead: false, score: 0, reasoning: 'Analysis failed' };
  }
}

// Send hot lead alert to business owner
async function sendHotLeadAlert(customerConfig, leadInfo, messageContent) {
  if (!twilioClient || !customerConfig.businessOwnerPhone || !customerConfig.enableHotLeadAlerts) {
    return false;
  }

  // Check business hours if enabled
  if (customerConfig.alertBusinessHours) {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 8 || hour > 18) { // Outside 8 AM - 6 PM
      return false;
    }
  }

  // Throttle alerts - max 1 per lead per 30 minutes
  const throttleKey = `${customerConfig.phoneNumber}_${leadInfo.phone}`;
  const lastAlert = customerConfigs.get(`${throttleKey}_last_alert`);
  if (lastAlert && (Date.now() - lastAlert) < 30 * 60 * 1000) {
    return false; // Skip if alerted within last 30 minutes
  }

  try {
    const alertMessage = `🔥 HOT LEAD ALERT!\n\nScore: ${leadInfo.score}/10\nFrom: ${leadInfo.phone}\nMessage: "${messageContent.slice(0, 100)}${messageContent.length > 100 ? '...' : ''}"\n\nReason: ${leadInfo.reasoning}\n\n${customerConfig.businessName} AI Assistant`;

    await twilioClient.messages.create({
      body: alertMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: customerConfig.businessOwnerPhone
    });

    // Update throttle timestamp
    customerConfigs.set(`${throttleKey}_last_alert`, Date.now());
    
    console.log(`Hot lead alert sent to ${customerConfig.businessOwnerPhone}`);
    return true;
  } catch (error) {
    console.error('Failed to send hot lead alert:', error);
    return false;
  }
}

// Get AI response with customer configuration
async function getAIResponse(message, customerConfig, conversationHistory = []) {
  if (!openai) {
    return "I'm here to help! However, my AI capabilities are currently being configured. Please try again in a moment.";
  }

  try {
    const systemPrompt = `You are ${customerConfig.businessName}'s AI assistant with a ${customerConfig.personality} personality.

Business Information:
${customerConfig.businessInfo || 'Professional service business focused on helping customers.'}

Key Instructions:
- Keep responses under 160 characters for SMS
- Be helpful and ${customerConfig.personality}
- Focus on ${customerConfig.businessName}
- If asked about services, mention: "${customerConfig.businessInfo}"
- Always aim to help and provide value
- For complex inquiries, offer to connect them with a human representative

Conversation history context: ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: customerConfig.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
      temperature: customerConfig.creativity || 0.7
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI Response Error:', error);
    return "Thanks for your message! I'm experiencing some technical difficulties right now, but I'll make sure someone gets back to you soon.";
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const messageBody = formData.get('Body');
    const fromNumber = formData.get('From');
    const toNumber = formData.get('To');

    console.log('📱 SMS Webhook received:', {
      from: fromNumber,
      to: toNumber,
      message: messageBody
    });

    // Get customer configuration for this phone number
    let customerConfig = customerConfigs.get(toNumber) || {
      phoneNumber: toNumber,
      businessName: 'Professional Service',
      personality: 'professional',
      businessInfo: 'We provide professional services to help our customers achieve their goals.',
      model: 'gpt-4o-mini',
      creativity: 0.7,
      welcomeMessage: 'Thanks for reaching out! How can I help you today?',
      businessOwnerPhone: null,
      enableHotLeadAlerts: false,
      alertBusinessHours: true
    };

    // Get or create conversation
    const conversationKey = `${toNumber}_${fromNumber}`;
    let conversation = conversations.get(conversationKey) || {
      id: conversationKey,
      toNumber: toNumber,
      fromNumber: fromNumber,
      messages: [],
      leadCaptured: false,
      createdAt: new Date().toISOString()
    };

    // Add incoming message to conversation
    conversation.messages.push({
      id: Date.now().toString(),
      body: messageBody,
      from: fromNumber,
      to: toNumber,
      timestamp: new Date().toISOString(),
      direction: 'inbound'
    });

    // Analyze for hot lead
    const conversationHistory = conversation.messages.slice(-6).map(msg => ({
      role: msg.from === fromNumber ? 'user' : 'assistant',
      content: msg.body
    }));

    const hotLeadAnalysis = await analyzeHotLead(messageBody, conversationHistory);
    
    console.log('🔥 Hot lead analysis:', hotLeadAnalysis);

    // Send alert if hot lead detected
    if (hotLeadAnalysis.isHotLead) {
      const alertSent = await sendHotLeadAlert(customerConfig, {
        phone: fromNumber,
        score: hotLeadAnalysis.score,
        reasoning: hotLeadAnalysis.reasoning
      }, messageBody);
      
      console.log('📢 Hot lead alert sent:', alertSent);
    }

    // Capture lead if not already captured
    if (!conversation.leadCaptured) {
      // Simple lead capture logic
      conversation.leadCaptured = true;
      console.log('📝 New lead captured:', {
        phone: fromNumber,
        source: 'SMS',
        firstMessage: messageBody,
        hotLeadScore: hotLeadAnalysis.score
      });
    }

    // Get AI response
    let aiResponse;
    
    // Check if this is the first message and we have a welcome message
    if (conversation.messages.length === 1 && customerConfig.welcomeMessage) {
      aiResponse = customerConfig.welcomeMessage;
    } else {
      aiResponse = await getAIResponse(messageBody, customerConfig, conversationHistory);
    }

    // Add AI response to conversation
    conversation.messages.push({
      id: (Date.now() + 1).toString(),
      body: aiResponse,
      from: toNumber,
      to: fromNumber,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      hotLeadScore: hotLeadAnalysis.score
    });

    // Update conversation in storage
    conversations.set(conversationKey, conversation);

    console.log('✅ SMS processed successfully:', {
      conversationId: conversationKey,
      messageCount: conversation.messages.length,
      aiResponse: aiResponse.slice(0, 50) + '...',
      hotLeadScore: hotLeadAnalysis.score
    });

    // Return TwiML response (no actual SMS sending yet due to A2P registration)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- SMS Response will be sent once A2P 10DLC registration is complete -->
  <!-- For now, response is logged and stored for testing -->
</Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('❌ SMS Webhook Error:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Error occurred but webhook acknowledged -->
</Response>`;

    return new Response(errorResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// GET endpoint for retrieving conversations (for dashboard)
export async function GET(request) {
  try {
    const conversationArray = Array.from(conversations.values());
    
    return NextResponse.json({
      success: true,
      conversations: conversationArray,
      totalConversations: conversationArray.length,
      totalMessages: conversationArray.reduce((total, conv) => total + conv.messages.length, 0)
    });
  } catch (error) {
    console.error('❌ SMS GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      conversations: [],
      totalConversations: 0,
      totalMessages: 0
    }, { status: 500 });
  }
}
