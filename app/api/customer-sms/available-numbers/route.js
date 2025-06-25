import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function GET() {
  try {
    if (!twilioClient) {
      return NextResponse.json({
        success: false,
        error: 'SMS service not configured',
        numbers: []
      }, { status: 500 });
    }

    // Search for available local phone numbers
    const availableNumbers = await twilioClient.availablePhoneNumbers('US').local.list({
      smsEnabled: true,
      limit: 10,
      // Try different area codes for variety
      areaCode: Math.random() > 0.5 ? '804' : undefined
    });

    // Format numbers for customer display
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      locality: number.locality,
      region: number.region,
      postalCode: number.postalCode,
      capabilities: {
        sms: number.capabilities.sms,
        voice: number.capabilities.voice
      },
      monthlyFee: 1.15 // Standard Twilio local number fee
    }));

    console.log('📞 Found available numbers for customer:', formattedNumbers.length);

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error) {
    console.error('❌ Available Numbers Error:', error);
    
    // Return sample numbers if Twilio fails (for demo)
    const sampleNumbers = [
      {
        phoneNumber: '+18045551234',
        locality: 'Richmond',
        region: 'VA',
        capabilities: { sms: true, voice: true },
        monthlyFee: 1.15
      },
      {
        phoneNumber: '+18045555678',
        locality: 'Virginia Beach',
        region: 'VA', 
        capabilities: { sms: true, voice: true },
        monthlyFee: 1.15
      }
    ];

    return NextResponse.json({
      success: true,
      numbers: sampleNumbers,
      count: sampleNumbers.length,
      demo: true
    });
  }
}
