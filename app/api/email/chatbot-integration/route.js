// app/api/email/chatbot-integration/route.js
// Main email automation integration endpoint

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { emailService } from '../../../../lib/email-automation-service.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      businessType, 
      message, 
      score 
    } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    console.log('📧 Email automation triggered for:', email, 'Score:', score);

    // Process the lead through email automation
    const result = await emailService.handleChatbotLead({
      name,
      email,
      phone,
      businessType: businessType || 'real estate',
      message,
      userId,
      score: score || 0
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Email automation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Email automation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// ===============================================
// app/api/email/send/route.js
// Manual email sending endpoint

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'test') {
      // Test email functionality
      return NextResponse.json({ 
        status: 'Email automation is ready',
        resendConfigured: !!process.env.RESEND_API_KEY,
        openaiConfigured: !!process.env.OPENAI_API_KEY
      });
    }

    // Get email stats
    const stats = await emailService.getEmailStats(userId);
    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
