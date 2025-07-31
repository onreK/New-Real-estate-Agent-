// app/api/sms/webhook/route.js - UPDATED TO USE CENTRALIZED AI SERVICE
import { NextResponse } from 'next/server';
import twilio from 'twilio';
// 🎯 IMPORT THE CENTRALIZED AI SERVICE - FIXED IMPORT PATH
import { generateSMSResponse } from '../../../../lib/ai-service.js';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory storage for conversations and customer configs
const conversations = new Map();
const customerConfigs = new Map();

// Send hot lead alert to business owner (unchanged)
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

export async function POST(request) {
  console.log('📱 === SMS WEBHOOK WITH CENTRALIZED AI SERVICE ===');
  
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

    // 🎯 USE CENTRALIZED AI SERVICE FOR SMS RESPONSE
    console.log('🧠 Using centralized AI service for SMS...');
    
    // Build conversation history for context
    const conversationHistory = conversation.messages.slice(-6).map(msg => ({
      role: msg.from === fromNumber ? 'user' : 'assistant',
      content: msg.body,
      sender_type: msg.from === fromNumber ? 'user' : 'assistant'
    }));

    let aiResult;
    
    // Check if this is the first message and we have a welcome message
    if (conversation.messages.length === 1 && customerConfig.welcomeMessage) {
      // For welcome messages, we still use centralized service for consistency and hot lead detection
      aiResult = await generateSMSResponse(
        fromNumber, // phone number
        messageBody, // user message
        conversationHistory // conversation history
      );
      // But override the response with welcome message if it's the first interaction
      aiResult.response = customerConfig.welcomeMessage;
    } else {
      // Use centralized AI service for regular responses
      aiResult = await generateSMSResponse(
        fromNumber, // phone number  
        messageBody, // user message
        conversationHistory // conversation history
      );
    }

    console.log('✅ Centralized AI service result:', {
      success: aiResult.success,
      hotLead: aiResult.hotLead?.isHotLead,
      score: aiResult.hotLead?.score,
      knowledgeBaseUsed: aiResult.metadata?.knowledgeBaseUsed
    });

    // Get AI response (fallback if service fails)
    let aiResponse;
    if (aiResult.success) {
      aiResponse = aiResult.response;
    } else {
      console.error('❌ Centralized AI service failed:', aiResult.error);
      aiResponse = "Thanks for your message! I'm experiencing some technical difficulties right now, but I'll make sure someone gets back to you soon.";
    }

    // Send alert if hot lead detected by centralized service
    if (aiResult.hotLead?.isHotLead) {
      const alertSent = await sendHotLeadAlert(customerConfig, {
        phone: fromNumber,
        score: aiResult.hotLead.score,
        reasoning: aiResult.hotLead.reasoning
      }, messageBody);
      
      console.log('📢 Hot lead alert sent:', alertSent);
    }

    // Capture lead if not already captured
    if (!conversation.leadCaptured) {
      conversation.leadCaptured = true;
      console.log('📝 New lead captured:', {
        phone: fromNumber,
        source: 'SMS',
        firstMessage: messageBody,
        hotLeadScore: aiResult.hotLead?.score || 0,
        centralizedAI: true
      });
    }

    // Add AI response to conversation
    conversation.messages.push({
      id: (Date.now() + 1).toString(),
      body: aiResponse,
      from: toNumber,
      to: fromNumber,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      hotLeadScore: aiResult.hotLead?.score || 0,
      aiServiceUsed: aiResult.success
    });

    // Update conversation in storage
    conversations.set(conversationKey, conversation);

    console.log('✅ SMS processed successfully with centralized AI service:', {
      conversationId: conversationKey,
      messageCount: conversation.messages.length,
      aiResponse: aiResponse.slice(0, 50) + '...',
      hotLeadScore: aiResult.hotLead?.score || 0,
      centralizedAI: aiResult.success,
      tokensUsed: aiResult.metadata?.tokensUsed || 0,
      knowledgeBaseUsed: aiResult.metadata?.knowledgeBaseUsed || false
    });

    // Return TwiML response (no actual SMS sending yet due to A2P registration)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- SMS Response will be sent once A2P 10DLC registration is complete -->
  <!-- For now, response is logged and stored for testing -->
  <!-- Powered by Centralized AI Service v2.0 -->
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
      totalMessages: conversationArray.reduce((total, conv) => total + conv.messages.length, 0),
      centralizedAI: true,
      version: '2.0'
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
