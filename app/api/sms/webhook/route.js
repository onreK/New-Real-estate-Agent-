import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize OpenAI with debugging
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

// In-memory storage for conversations (use database in production)
let smsConversations = new Map();
let smsLeads = [];

// Business hours configuration
const BUSINESS_HOURS = {
  start: 9,    // 9 AM
  end: 18,     // 6 PM
  timezone: 'America/New_York',
  days: [1, 2, 3, 4, 5] // Monday-Friday (0=Sunday, 6=Saturday)
};

function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  return BUSINESS_HOURS.days.includes(day) && 
         hour >= BUSINESS_HOURS.start && 
         hour < BUSINESS_HOURS.end;
}

function getConversationId(from, to) {
  return `${from}-${to}`;
}

async function getAIResponse(message, conversationHistory = []) {
  try {
    // Get AI configuration
    let aiConfig;
    try {
      const { getAIConfig } = await import('../../ai-config/route.js');
      aiConfig = getAIConfig();
    } catch {
      aiConfig = {
        personality: 'professional',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 150, // Shorter for SMS
        knowledgeBase: '',
        systemPrompt: ''
      };
    }

    // SMS-specific system prompt
    const smsSystemPrompt = `You are an SMS AI assistant. Keep responses under 160 characters when possible. Be helpful and concise. You are representing a business via text message.`;
    
    const personalityPrompts = {
      professional: "Be professional and direct in your SMS responses.",
      friendly: "Be warm and friendly in your text messages.",
      enthusiastic: "Be positive and energetic in your SMS responses.",
      empathetic: "Be understanding and caring in your text messages.",
      expert: "Be knowledgeable and authoritative in your SMS responses."
    };

    let systemPrompt = smsSystemPrompt + ' ' + (aiConfig.systemPrompt || personalityPrompts[aiConfig.personality]);
    
    if (aiConfig.knowledgeBase) {
      systemPrompt += `\n\nBusiness Info: ${aiConfig.knowledgeBase}`;
    }

    // Call the existing chat API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        conversationHistory: conversationHistory,
        smsMode: true // Flag for SMS-specific handling
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.response;
    } else {
      throw new Error('Chat API error');
    }
  } catch (error) {
    console.error('❌ AI Response Error:', error);
    return "Thanks for your message! We'll get back to you soon.";
  }
}

async function saveSMSLead(phoneNumber, message, businessNumber) {
  const lead = {
    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'sms',
    phone: phoneNumber,
    businessPhone: businessNumber,
    message: message,
    timestamp: new Date().toISOString(),
    status: 'new',
    source: 'SMS Chat'
  };
  
  smsLeads.push(lead);
  console.log('📱 SMS Lead captured:', lead);
  return lead;
}

export async function POST(request) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    
    const {
      From: fromNumber,
      To: businessNumber,
      Body: messageBody,
      MessageSid,
      AccountSid
    } = body;

    console.log('📱 Incoming SMS:', {
      from: fromNumber,
      to: businessNumber,
      message: messageBody?.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!fromNumber || !messageBody || !businessNumber) {
      console.error('❌ Missing required SMS fields');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get or create conversation
    const conversationId = getConversationId(fromNumber, businessNumber);
    let conversation = smsConversations.get(conversationId) || {
      id: conversationId,
      from: fromNumber,
      to: businessNumber,
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Add incoming message to conversation
    conversation.messages.push({
      id: MessageSid,
      from: fromNumber,
      body: messageBody,
      timestamp: new Date().toISOString(),
      direction: 'inbound'
    });

    // Save lead on first message
    if (conversation.messages.length === 1) {
      await saveSMSLead(fromNumber, messageBody, businessNumber);
    }

    // Check business hours
    let aiResponse;
    if (!isBusinessHours()) {
      aiResponse = "Thanks for your message! Our business hours are 9 AM - 6 PM, Monday-Friday. We'll respond during business hours or feel free to visit our website.";
    } else {
      // Get AI response with conversation history
      const conversationHistory = conversation.messages.slice(-6).map(msg => ({
        role: msg.from === fromNumber ? 'user' : 'assistant',
        content: msg.body
      }));

      aiResponse = await getAIResponse(messageBody, conversationHistory);

      // Hot Lead Detection for SMS
      try {
        // Build full conversation for analysis
        const fullConversation = [
          ...conversationHistory,
          { role: 'user', content: messageBody }
        ];

        // Get AI config for business context
        let aiConfig;
        try {
          const { getAIConfig } = await import('../../ai-config/route.js');
          aiConfig = getAIConfig();
        } catch {
          aiConfig = { knowledgeBase: '', businessInfo: '' };
        }

        // Analyze for hot lead
        const hotLeadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hot-lead-detection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: fullConversation,
            source: 'sms',
            businessContext: aiConfig.knowledgeBase || aiConfig.businessInfo || '',
            customerId: 'sms_customer', // In production, determine from phone number
            businessPhone: businessNumber
          })
        });

        if (hotLeadResponse.ok) {
          const leadData = await hotLeadResponse.json();
          
          console.log('📊 SMS Lead Analysis:', {
            leadScore: leadData.leadScore,
            isHotLead: leadData.isHotLead,
            buyingIntent: leadData.analysis?.buyingIntent
          });

          // Send business owner alert if hot lead detected
          if (leadData.isHotLead) {
            // In production, get customer's business owner phone from database
            const businessOwnerPhone = process.env.AGENT_PHONE_NUMBER; // Placeholder
            
            if (businessOwnerPhone) {
              const alertResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/business-owner-alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  leadAnalysis: leadData,
                  businessOwnerPhone: businessOwnerPhone,
                  customerId: 'sms_customer',
                  alertConfig: {}
                })
              });

              if (alertResponse.ok) {
                console.log('🔥 Hot lead alert sent for SMS lead!');
              }
            }
          }
        }
      } catch (error) {
        console.error('Hot lead detection error:', error);
      }
    }

    // Add AI response to conversation
    const responseMessage = {
      id: `response_${Date.now()}`,
      from: businessNumber,
      body: aiResponse,
      timestamp: new Date().toISOString(),
      direction: 'outbound'
    };
    conversation.messages.push(responseMessage);
    conversation.lastActivity = new Date().toISOString();

    // Save conversation
    smsConversations.set(conversationId, conversation);

    // Send SMS response via Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse}</Message>
</Response>`;

    console.log('✅ SMS Response sent:', {
      to: fromNumber,
      responseLength: aiResponse.length,
      conversationLength: conversation.messages.length
    });

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    console.error('❌ SMS Webhook Error:', error);
    
    // Return basic TwiML response on error
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, we're experiencing technical difficulties. Please try again later.</Message>
</Response>`;

    return new NextResponse(errorResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}

// Export functions for other routes to use
export function getSMSConversations() {
  return Array.from(smsConversations.values());
}

export function getSMSLeads() {
  return smsLeads;
}

export function getSMSConversation(conversationId) {
  return smsConversations.get(conversationId);
}
