import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with debugging
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Debug: Log connection status
console.log('🔍 OpenAI Connection Status:', {
  hasApiKey: !!process.env.OPENAI_API_KEY,
  keyPreview: process.env.OPENAI_API_KEY ? 
    `${process.env.OPENAI_API_KEY.substring(0, 7)}...` : 'None',
  clientInitialized: !!openai
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], smsMode = false } = body;
    
    console.log('💬 Incoming Chat Request:', {
      message: message?.substring(0, 50) + '...',
      historyLength: conversationHistory.length,
      smsMode: smsMode,
      timestamp: new Date().toISOString()
    });

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        response: "Please provide a valid message.",
        isAI: false,
        error: 'invalid_message'
      }, { status: 400 });
    }

    // Check if OpenAI is available
    if (!openai) {
      console.log('⚠️ No OpenAI API key - using fallback');
      const fallbackMessage = smsMode 
        ? "Demo mode active. Add OpenAI API key for full AI features!"
        : "I'm currently in demo mode. To enable full AI capabilities, please add your OpenAI API key to the environment variables. I can still help with basic information about your business!";
      
      return NextResponse.json({
        response: fallbackMessage,
        isAI: false,
        timestamp: new Date().toISOString()
      });
    }

    // Try to get AI configuration
    let aiConfig;
    try {
      const { getAIConfig } = await import('../ai-config/route.js');
      aiConfig = getAIConfig();
      console.log('🤖 AI Config Loaded:', aiConfig.personality, aiConfig.model);
    } catch {
      aiConfig = {
        personality: 'professional',
        model: 'gpt-4o-mini',
        creativity: 0.7,
        maxTokens: 500,
        knowledgeBase: '',
        systemPrompt: ''
      };
      console.log('📋 Using default AI config');
    }

    // Build system prompt based on personality
    const personalityPrompts = {
      professional: "You are a professional business assistant. Be direct, informative, and helpful.",
      friendly: "You are a friendly and conversational assistant. Be warm, approachable, and personable.",
      enthusiastic: "You are an enthusiastic and energetic assistant. Be excited, positive, and motivating.",
      empathetic: "You are an empathetic and understanding assistant. Be caring, supportive, and considerate.",
      expert: "You are an expert technical assistant. Be precise, detailed, and authoritative."
    };

    let systemPrompt = aiConfig.systemPrompt || personalityPrompts[aiConfig.personality];
    
    if (aiConfig.knowledgeBase) {
      systemPrompt += `\n\nBusiness Knowledge Base:\n${aiConfig.knowledgeBase}`;
    }

    // SMS-specific adjustments
    if (smsMode) {
      systemPrompt += '\n\nIMPORTANT: This is an SMS conversation. Keep responses under 160 characters when possible. Be concise and helpful.';
      // Reduce max tokens for SMS
      aiConfig.maxTokens = Math.min(aiConfig.maxTokens, 150);
    }

    // Build messages array - FIXED MESSAGE FORMATTING
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history with proper validation
    if (Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg, index) => {
        if (msg && typeof msg === 'object' && msg.role && msg.content) {
          // Only add valid messages with both role and content
          if (['user', 'assistant', 'system'].includes(msg.role)) {
            messages.push({
              role: msg.role,
              content: String(msg.content)
            });
          }
        } else {
          console.warn(`⚠️ Invalid message in history at index ${index}:`, msg);
        }
      });
    }

    // Add current user message
    messages.push({ 
      role: 'user', 
      content: String(message) 
    });

    console.log('🚀 Sending to OpenAI:', {
      model: aiConfig.model,
      messageCount: messages.length,
      temperature: aiConfig.creativity,
      maxTokens: aiConfig.maxTokens,
      smsMode: smsMode,
      validatedMessages: messages.map(m => ({ role: m.role, contentLength: m.content.length }))
    });

    // Call OpenAI API with validated messages
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: messages,
      temperature: aiConfig.creativity,
      max_tokens: aiConfig.maxTokens,
    });

    const aiResponse = completion.choices[0].message.content;
    
    console.log('✅ OpenAI Response Received:', {
      responseLength: aiResponse.length,
      usage: completion.usage,
      model: completion.model,
      smsMode: smsMode
    });

    return NextResponse.json({
      response: aiResponse,
      isAI: true,
      model: aiConfig.model,
      usage: completion.usage,
      smsMode: smsMode,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat API Error:', {
      message: error.message,
      type: error.constructor.name,
      code: error.code,
      stack: error.stack?.substring(0, 200)
    });

    // Specific OpenAI error handling
    if (error.code === 'invalid_api_key') {
      return NextResponse.json({
        response: "❌ Invalid OpenAI API key. Please check your API key in environment variables.",
        isAI: false,
        error: 'invalid_api_key'
      }, { status: 401 });
    }

    if (error.code === 'insufficient_quota') {
      return NextResponse.json({
        response: "❌ OpenAI quota exceeded. Please check your billing or upgrade your plan.",
        isAI: false,
        error: 'quota_exceeded'
      }, { status: 402 });
    }

    // SMS-friendly error message
    const errorMessage = smsMode 
      ? "Sorry, technical difficulties. Please try again."
      : `I apologize, but I'm experiencing technical difficulties. Error: ${error.message}`;

    return NextResponse.json({
      response: errorMessage,
      isAI: false,
      error: error.message
    }, { status: 500 });
  }
}
