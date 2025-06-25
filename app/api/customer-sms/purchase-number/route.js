import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory storage for customer phone numbers (use database in production)
let customerPhoneNumbers = new Map();

export async function POST(request) {
  try {
    const { phoneNumber, customerId } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    console.log('📱 Customer purchasing number:', phoneNumber);

    if (!twilioClient) {
      // Demo mode - simulate purchase
      const purchasedNumber = {
        sid: `PN${Date.now()}`,
        phoneNumber: phoneNumber,
        friendlyName: `Customer SMS AI - ${new Date().toLocaleDateString()}`,
        status: 'purchased',
        capabilities: { sms: true, voice: true },
        monthlyFee: 1.15,
        customerId: customerId || 'demo_customer',
        purchasedAt: new Date().toISOString()
      };

      // Store in memory
      customerPhoneNumbers.set(phoneNumber, purchasedNumber);

      return NextResponse.json({
        success: true,
        phoneNumber: purchasedNumber,
        demo: true
      });
    }

    // Purchase phone number via Twilio
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      friendlyName: `Customer SMS AI - ${new Date().toLocaleDateString()}`,
      smsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/sms/webhook`,
      smsMethod: 'POST',
      // Note: Voice webhook intentionally not set for SMS-only service
    });

    // Store customer phone number association
    const customerNumberData = {
      sid: purchasedNumber.sid,
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName,
      status: 'active',
      capabilities: purchasedNumber.capabilities,
      monthlyFee: 1.15,
      customerId: customerId || 'demo_customer',
      purchasedAt: new Date().toISOString(),
      webhookConfigured: true
    };

    customerPhoneNumbers.set(phoneNumber, customerNumberData);

    console.log('✅ Number purchased successfully:', customerNumberData);

    return NextResponse.json({
      success: true,
      phoneNumber: customerNumberData
    });

  } catch (error) {
    console.error('❌ Purchase Number Error:', error);

    // Handle specific Twilio errors
    if (error.code === 21422) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is no longer available. Please choose another number.'
      }, { status: 409 });
    }

    if (error.code === 20003) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed. Please contact support.'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to purchase phone number. Please try again.'
    }, { status: 500 });
  }
}

// Get customer's purchased numbers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || 'demo_customer';

    // Get all numbers for this customer
    const customerNumbers = Array.from(customerPhoneNumbers.values())
      .filter(number => number.customerId === customerId);

    return NextResponse.json({
      success: true,
      numbers: customerNumbers,
      count: customerNumbers.length
    });

  } catch (error) {
    console.error('❌ Get Customer Numbers Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load customer numbers'
    }, { status: 500 });
  }
}

// Export functions for other routes to use
export function getCustomerPhoneNumbers() {
  return Array.from(customerPhoneNumbers.values());
}

export function getCustomerPhoneNumber(phoneNumber) {
  return customerPhoneNumbers.get(phoneNumber);
}
