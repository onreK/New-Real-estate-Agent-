import { NextResponse } from 'next/server';

// In-memory storage for customer SMS service status
let customerSMSServices = new Map();

// Import helper functions
async function getCustomerAIConfig(phoneNumber) {
  try {
    const { getCustomerAIConfig } = await import('../configure-ai/route.js');
    return getCustomerAIConfig(phoneNumber);
  } catch (error) {
    console.error('Error getting AI config:', error);
    return null;
  }
}

async function getCustomerPhoneNumber(phoneNumber) {
  try {
    const { getCustomerPhoneNumber } = await import('../purchase-number/route.js');
    return getCustomerPhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Error getting phone number:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    const { phoneNumber, customerId } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    console.log('🚀 Activating SMS service for:', phoneNumber);

    // Verify phone number belongs to customer
    const customerNumber = await getCustomerPhoneNumber(phoneNumber);
    if (!customerNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number not found or not owned by customer'
      }, { status: 404 });
    }

    // Verify AI configuration exists
    const aiConfig = await getCustomerAIConfig(phoneNumber);
    if (!aiConfig) {
      return NextResponse.json({
        success: false,
        error: 'AI configuration required before activation'
      }, { status: 400 });
    }

    // Create SMS service record
    const smsService = {
      phoneNumber: phoneNumber,
      customerId: customerId || 'demo_customer',
      status: 'active',
      businessName: aiConfig.businessName,
      personality: aiConfig.personality,
      
      // Service details
      activatedAt: new Date().toISOString(),
      billingStatus: 'active',
      planType: 'pro', // $299/month plan
      
      // Usage tracking
      messagesThisMonth: 0,
      conversationsThisMonth: 0,
      leadsThisMonth: 0,
      
      // Service features
      features: {
        smsAI: true,
        leadCapture: true,
        businessHours: aiConfig.businessHours?.enabled || false,
        autoResponses: true,
        dashboard: true
      },
      
      // Billing info
      billing: {
        planName: 'Pro SMS AI',
        monthlyFee: 299.00,
        twilioFees: 1.15, // Phone number fee
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    // Store service activation
    customerSMSServices.set(phoneNumber, smsService);

    console.log('✅ SMS Service activated:', {
      phoneNumber,
      businessName: aiConfig.businessName,
      customerId: customerId || 'demo_customer'
    });

    // TODO: In production, you would:
    // - Update customer billing (Stripe subscription)
    // - Send activation confirmation email
    // - Log activation for analytics
    // - Update CRM/customer database

    return NextResponse.json({
      success: true,
      service: {
        phoneNumber: smsService.phoneNumber,
        status: smsService.status,
        businessName: smsService.businessName,
        activatedAt: smsService.activatedAt,
        planType: smsService.planType,
        features: smsService.features
      },
      nextSteps: [
        'Share your SMS number with customers',
        'Monitor conversations in your dashboard',
        'Track leads and responses',
        'Adjust AI settings as needed'
      ]
    });

  } catch (error) {
    console.error('❌ SMS Activation Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to activate SMS service'
    }, { status: 500 });
  }
}

// Get SMS service status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const customerId = searchParams.get('customerId');

    if (phoneNumber) {
      const service = customerSMSServices.get(phoneNumber);
      if (service) {
        return NextResponse.json({
          success: true,
          service: service
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'SMS service not found'
        }, { status: 404 });
      }
    }

    // Get all services for customer
    if (customerId) {
      const customerServices = Array.from(customerSMSServices.values())
        .filter(service => service.customerId === customerId);
      
      return NextResponse.json({
        success: true,
        services: customerServices,
        count: customerServices.length
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Phone number or customer ID required'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Get SMS Service Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load SMS service'
    }, { status: 500 });
  }
}

// Deactivate SMS service
export async function DELETE(request) {
  try {
    const { phoneNumber, customerId } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    const service = customerSMSServices.get(phoneNumber);
    if (!service) {
      return NextResponse.json({
        success: false,
        error: 'SMS service not found'
      }, { status: 404 });
    }

    // Update service status
    service.status = 'deactivated';
    service.deactivatedAt = new Date().toISOString();
    customerSMSServices.set(phoneNumber, service);

    console.log('🔴 SMS Service deactivated:', phoneNumber);

    return NextResponse.json({
      success: true,
      message: 'SMS service deactivated successfully'
    });

  } catch (error) {
    console.error('❌ SMS Deactivation Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to deactivate SMS service'
    }, { status: 500 });
  }
}

// Export functions for other routes to use
export function getCustomerSMSService(phoneNumber) {
  return customerSMSServices.get(phoneNumber);
}

export function getAllCustomerSMSServices() {
  return Array.from(customerSMSServices.values());
}
