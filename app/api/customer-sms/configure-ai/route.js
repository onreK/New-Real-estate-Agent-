import { NextResponse } from 'next/server';

// In-memory storage for customer AI configurations (use database in production)
let customerAIConfigs = new Map();

export async function POST(request) {
  try {
    const { phoneNumber, config, customerId } = await request.json();

    if (!phoneNumber || !config) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and configuration are required'
      }, { status: 400 });
    }

    // Validate required config fields
    if (!config.businessName || !config.businessInfo) {
      return NextResponse.json({
        success: false,
        error: 'Business name and information are required'
      }, { status: 400 });
    }

    // Create comprehensive AI configuration
    const aiConfig = {
      phoneNumber: phoneNumber,
      customerId: customerId || 'demo_customer',
      businessName: config.businessName,
      personality: config.personality || 'professional',
      businessInfo: config.businessInfo,
      welcomeMessage: config.welcomeMessage || `Hi! Thanks for texting ${config.businessName}. How can I help you today?`,
      
      // Hot Lead Alert Settings
      businessOwnerPhone: config.businessOwnerPhone || null,
      enableHotLeadAlerts: config.enableHotLeadAlerts !== false,
      alertConfig: {
        respectBusinessHours: config.alertBusinessHours !== false,
        startHour: 9,
        endHour: 20,
        allowedDays: [1, 2, 3, 4, 5], // Monday-Friday
        minLeadScore: 7,
        customTemplate: null
      },
      
      // Technical AI settings optimized for SMS
      model: 'gpt-4o-mini',
      creativity: 0.7,
      maxTokens: 150, // Shorter for SMS
      
      // SMS-specific settings
      smsEnabled: true,
      businessHours: {
        enabled: false, // Can be configured later
        start: '09:00',
        end: '18:00',
        timezone: 'America/New_York',
        days: [1, 2, 3, 4, 5] // Monday-Friday
      },
      
      // Auto-responses
      autoResponses: {
        afterHours: `Thanks for your message! Our business hours are 9 AM - 6 PM, Monday-Friday. We'll respond during business hours.`,
        defaultError: `I apologize, but I'm having trouble right now. Please try again or call us directly.`
      },
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'configured'
    };

    // Build system prompt based on personality and business info
    const personalityPrompts = {
      professional: "You are a professional business assistant. Be direct, informative, and helpful.",
      friendly: "You are a friendly and conversational assistant. Be warm, approachable, and personable.",
      enthusiastic: "You are an enthusiastic and energetic assistant. Be excited, positive, and motivating.",
      empathetic: "You are an empathetic and understanding assistant. Be caring, supportive, and considerate."
    };

    aiConfig.systemPrompt = `${personalityPrompts[config.personality]}

Business Information:
Business Name: ${config.businessName}
${config.businessInfo}

IMPORTANT: This is an SMS conversation. Keep responses under 160 characters when possible. Be concise and helpful. Always represent ${config.businessName} professionally.

If customers ask about services, pricing, hours, or want to schedule something, provide helpful information based on the business details above.`;

    // Store configuration
    customerAIConfigs.set(phoneNumber, aiConfig);

    console.log('🤖 AI Configuration saved for customer:', {
      phoneNumber,
      businessName: config.businessName,
      personality: config.personality
    });

    return NextResponse.json({
      success: true,
      config: {
        phoneNumber: aiConfig.phoneNumber,
        businessName: aiConfig.businessName,
        personality: aiConfig.personality,
        status: aiConfig.status
      }
    });

  } catch (error) {
    console.error('❌ Configure AI Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save AI configuration'
    }, { status: 500 });
  }
}

// Get AI configuration for a phone number
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const customerId = searchParams.get('customerId');

    if (phoneNumber) {
      const config = customerAIConfigs.get(phoneNumber);
      if (config) {
        return NextResponse.json({
          success: true,
          config: config
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Configuration not found'
        }, { status: 404 });
      }
    }

    // Get all configs for customer
    if (customerId) {
      const customerConfigs = Array.from(customerAIConfigs.values())
        .filter(config => config.customerId === customerId);
      
      return NextResponse.json({
        success: true,
        configs: customerConfigs,
        count: customerConfigs.length
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Phone number or customer ID required'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Get AI Config Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load AI configuration'
    }, { status: 500 });
  }
}

// Export functions for SMS webhook to use
export function getCustomerAIConfig(phoneNumber) {
  return customerAIConfigs.get(phoneNumber);
}

export function getAllCustomerAIConfigs() {
  return Array.from(customerAIConfigs.values());
}
