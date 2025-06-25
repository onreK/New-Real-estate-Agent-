import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with debugging
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Debug: Log connection status
console.log('🤖 OpenAI Connection Status:', {
  hasApiKey: !!process.env.OPENAI_API_KEY,
  keyPreview: process.env.OPENAI_API_KEY ? 'sk-proj...' : 'Not found',
  clientInitialized: !!openai,
  timestamp: new Date().toISOString()
});

// In-memory storage for configurations and conversations
const aiConfigs = new Map();
const conversations = new Map();

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

Our experienced agents help clients navigate the real estate market with personalized service and local expertise. We're committed to making your real estate goals a reality.`,
  model: 'gpt-4o-mini',
  creativity: 0.7,
  responseLength: 'medium',
  knowledgeBase: 'Our office is located in Chester, Virginia. We serve the Richmond metro area and surrounding counties. Contact us at (804) 555-0123 or visit our website for more information.',
  welcomeMessage: 'Hi! I\'m the AI assistant for Test Real Estate Co. How can I help you with your real estate needs today?'
};

// Store default config
aiConfigs.set('default', defaultConfig);

// Hot lead detection function
async function analyzeHotLead(message, conversationHistory = []) {
  try {
    console.log('🔥 Starting hot lead analysis for message:', message.slice(0, 50) + '...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/hot-lead-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`Hot lead API error: ${response.status}`);
    }

    const analysis = await response.json();
    console.log('✅ Hot lead analysis result:', analysis);
    return analysis;

  } catch (error) {
    console.error('❌ Hot lead analysis error:', error);
    return {
      success: false,
      isHotLead: false,
      score: 0,
      reasoning: 'Analysis failed',
      keywords: [],
      urgency: 'low',
      nextAction: 'Standard follow-up'
    };
  }
}

// Send business owner alert for hot leads
async function sendHotLeadAlert(leadAnalysis, message, customerConfig) {
  if (!leadAnalysis.isHotLead || !customerConfig.businessOwnerPhone) {
    return false;
  }

  try {
    console.log('📢 Sending hot lead alert...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/business-owner-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessOwnerPhone: customerConfig.businessOwnerPhone,
        leadInfo: {
          phone: 'Web Visitor',
          score: leadAnalysis.score,
          reasoning: leadAnalysis.reasoning,
          nextAction: leadAnalysis.nextAction
        },
        messageContent: message,
        customerConfig: {
          businessName: customerConfig.businessName,
          enableHotLeadAlerts: customerConfig.enableHotLeadAlerts !== false,
          alertBusinessHours: customerConfig.alertBusinessHours
        },
        source: 'web'
      })
    });

    const result = await response.json();
    console.log('📱 Hot lead alert result:', result);
    return result.success && result.alertSent;

  } catch (error) {
    console.error('❌ Hot lead alert error:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    console.log('💬 Chat API called at:', new Date().toISOString());
    
    const body = await request.json();
    const { 
      message, 
      conversationId = 'default', 
      configId = 'default',
      smsMode = false,
      testMode = false 
    } = body;

    console.log('📝 Chat request:', {
      messageLength: message?.length || 0,
      conversationId,
      configId,
      smsMode,
      testMode,
      messagePreview: message?.slice(0, 50) + '...'
    });

    // Validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string',
        received: { message, type: typeof message }
      }, { status: 400 });
    }

    // Get AI configuration
    const aiConfig = aiConfigs.get(configId) || defaultConfig;
    console.log('⚙️ Using AI config:', {
      businessName: aiConfig.businessName,
      personality: aiConfig.personality,
      model: aiConfig.model
    });

    // OpenAI availability check
    if (!openai) {
      console.error('❌ OpenAI client not initialized');
      return NextResponse.json({
        response: "I'm experiencing some technical difficulties connecting to my AI service. Please try again in a moment, or contact our support team if this continues.",
        isAI: false,
        error: 'OpenAI not configured',
        debug: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get or create conversation
    let conversation = conversations.get(conversationId) || {
      id: conversationId,
      messages: [],
      createdAt: new Date().toISOString(),
      leadCaptured: false
    };

    // Add user message to conversation history
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Prepare conversation history for AI (last 6 messages)
    const recentHistory = conversation.messages.slice(-6);

    // Build system prompt based on configuration
    let systemPrompt = `You are an AI assistant for ${aiConfig.businessName} with a ${aiConfig.personality} personality.

Business Information:
${aiConfig.businessInfo}

${aiConfig.knowledgeBase ? `Additional Knowledge:
${aiConfig.knowledgeBase}` : ''}

Key Instructions:
- Be helpful, ${aiConfig.personality}, and professional
- Focus on ${aiConfig.businessName} and our services
- ${smsMode ? 'Keep responses under 160 characters for SMS' : 'Provide detailed, helpful responses'}
- If asked about services not mentioned in the business info, politely redirect to what we do offer
- For scheduling or specific requests, offer to connect them with a human representative
- Always aim to help and provide value to potential customers

${aiConfig.responseLength === 'short' ? 'Keep responses concise and to the point.' : 
  aiConfig.responseLength === 'long' ? 'Provide detailed, comprehensive responses.' : 
  'Provide balanced, moderately detailed responses.'}`;

    console.log('🤖 Calling OpenAI with model:', aiConfig.model);

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory
      ],
      max_tokens: smsMode ? 100 : (aiConfig.responseLength === 'short' ? 150 : aiConfig.responseLength === 'long' ? 500 : 300),
      temperature: aiConfig.creativity || 0.7
    });

    const aiResponse = completion.choices[0].message.content.trim();

    console.log('✅ AI response generated:', {
      length: aiResponse.length,
      model: aiConfig.model,
      usage: completion.usage
    });

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      model: aiConfig.model
    });

    // Analyze for hot lead (only for non-test messages)
    let hotLeadAnalysis = null;
    let alertSent = false;

    if (!testMode) {
      console.log('🔥 Starting hot lead analysis...');
      
      // Prepare conversation history for hot lead analysis
      const conversationForAnalysis = recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      hotLeadAnalysis = await analyzeHotLead(message, conversationForAnalysis);

      // Send alert if hot lead detected
      if (hotLeadAnalysis.isHotLead) {
        console.log('🚨 Hot lead detected! Attempting to send alert...');
        alertSent = await sendHotLeadAlert(hotLeadAnalysis, message, aiConfig);
      }
    }

    // Capture lead if not already done and not in test mode
    if (!conversation.leadCaptured && !testMode) {
      console.log('📝 New lead captured from web chat');
      conversation.leadCaptured = true;
      conversation.leadSource = 'web_chat';
      conversation.hotLeadScore = hotLeadAnalysis?.score || 0;
    }

    // Update conversation in storage
    conversations.set(conversationId, conversation);

    // Return response with hot lead analysis
    return NextResponse.json({
      response: aiResponse,
      isAI: true,
      model: aiConfig.model,
      usage: completion.usage,
      smsMode: smsMode,
      hotLeadAnalysis: hotLeadAnalysis,
      alertSent: alertSent,
      conversationId: conversationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat API Error:', error);
    
    // Determine if this is an OpenAI API error
    const isOpenAIError = error.message?.includes('OpenAI') || error.status === 401;
    
    let errorResponse = "I'm having some technical difficulties right now. Please try again in a moment.";
    
    if (isOpenAIError) {
      errorResponse = "I'm experiencing connectivity issues with my AI service. Please try again shortly.";
    }

    return NextResponse.json({
      response: errorResponse,
      isAI: false,
      error: error.message,
      errorType: isOpenAIError ? 'openai_error' : 'general_error',
      debug: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// GET endpoint for retrieving AI configuration
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config') || 'default';
    const action = searchParams.get('action');

    if (action === 'test-connection') {
      // Test OpenAI connection
      if (!openai) {
        return NextResponse.json({
          connected: false,
          error: 'OpenAI client not initialized',
          hasApiKey: !!process.env.OPENAI_API_KEY
        });
      }

      try {
        const testCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        });

        return NextResponse.json({
          connected: true,
          model: 'gpt-4o-mini',
          usage: testCompletion.usage,
          timestamp: new Date().toISOString()
        });
      } catch (testError) {
        return NextResponse.json({
          connected: false,
          error: testError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (action === 'conversations') {
      // Return conversation statistics
      const conversationArray = Array.from(conversations.values());
      return NextResponse.json({
        totalConversations: conversationArray.length,
        totalMessages: conversationArray.reduce((total, conv) => total + conv.messages.length, 0),
        leadsGenerated: conversationArray.filter(conv => conv.leadCaptured).length,
        conversations: conversationArray.slice(0, 10) // Return last 10 for preview
      });
    }

    // Return current AI configuration
    const config = aiConfigs.get(configId) || defaultConfig;
    
    return NextResponse.json({
      success: true,
      config: config,
      availableConfigs: Array.from(aiConfigs.keys()),
      openaiStatus: {
        connected: !!openai,
        hasApiKey: !!process.env.OPENAI_API_KEY
      }
    });

  } catch (error) {
    console.error('❌ Chat GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
