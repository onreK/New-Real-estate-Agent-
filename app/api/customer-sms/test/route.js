import { NextResponse } from 'next/server';

// Import AI config function
async function getCustomerAIConfig(phoneNumber) {
  try {
    const { getCustomerAIConfig } = await import('../configure-ai/route.js');
    return getCustomerAIConfig(phoneNumber);
  } catch (error) {
    console.error('Error getting AI config:', error);
    return null;
  }
}

// Generate AI response using OpenAI
async function generateAIResponse(message, aiConfig) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return `[Demo Response] Thanks for asking about "${message.substring(0, 30)}...". I'd be happy to help with information about ${aiConfig.businessName}. This is a demo response - add your OpenAI API key for real AI responses.`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        conversationHistory: [],
        smsMode: true,
        customConfig: aiConfig // Pass customer's specific config
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.response;
    } else {
      throw new Error('Chat API error');
    }
  } catch (error) {
    console.error('AI Response Error:', error);
    return `Thanks for your message about ${aiConfig.businessName}! I'm having a brief technical issue, but I'd be happy to help you. Please try again in a moment.`;
  }
}

export async function POST(request) {
  try {
    const { phoneNumber, message, customerId } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and message are required'
      }, { status: 400 });
    }

    console.log('🧪 Testing SMS for customer:', {
      phoneNumber,
      testMessage: message.substring(0, 50) + '...'
    });

    // Get customer's AI configuration
    const aiConfig = await getCustomerAIConfig(phoneNumber);
    
    if (!aiConfig) {
      return NextResponse.json({
        success: false,
        error: 'AI configuration not found for this phone number'
      }, { status: 404 });
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(message, aiConfig);

    // Log test interaction
    const testResult = {
      phoneNumber: phoneNumber,
      customerId: customerId || 'demo_customer',
      testMessage: message,
      response: aiResponse,
      aiPersonality: aiConfig.personality,
      businessName: aiConfig.businessName,
      timestamp: new Date().toISOString(),
      success: true
    };

    console.log('✅ SMS Test completed:', {
      business: aiConfig.businessName,
      personality: aiConfig.personality,
      responseLength: aiResponse.length
    });

    return NextResponse.json({
      success: true,
      testMessage: message,
      response: aiResponse,
      config: {
        businessName: aiConfig.businessName,
        personality: aiConfig.personality,
        model: aiConfig.model
      },
      metadata: {
        responseLength: aiResponse.length,
        timestamp: testResult.timestamp
      }
    });

  } catch (error) {
    console.error('❌ SMS Test Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test SMS response'
    }, { status: 500 });
  }
}

// Get test history for a customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const customerId = searchParams.get('customerId');

    // This would typically come from a database
    // For now, return sample test history
    const sampleHistory = [
      {
        testMessage: 'What are your hours?',
        response: 'Our business hours are 9 AM - 6 PM, Monday through Friday. How else can I help you?',
        timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
      },
      {
        testMessage: 'How much does it cost?',
        response: 'Our pricing varies by service. I\'d be happy to discuss options that fit your needs. What service are you interested in?',
        timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
      }
    ];

    return NextResponse.json({
      success: true,
      history: sampleHistory,
      count: sampleHistory.length
    });

  } catch (error) {
    console.error('❌ Get Test History Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load test history'
    }, { status: 500 });
  }
}
