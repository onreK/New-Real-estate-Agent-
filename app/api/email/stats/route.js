// app/api/email/stats/route.js
// Email analytics endpoint

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { emailService } from '../../../../lib/email-automation-service.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await emailService.getEmailStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Email stats error:', error);
    return NextResponse.json({ error: 'Failed to get email stats' }, { status: 500 });
  }
}

// ===============================================
// app/api/email/webhooks/resend/route.js
// Resend webhook handler for email events

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Verify webhook signature here if needed
    // const signature = request.headers.get('resend-signature');

    console.log('📬 Resend webhook received:', type);

    // Log the webhook for now
    // You can expand this to update email status in your database
    if (data && data.email && data.email.id) {
      console.log('📧 Email event:', {
        eventType: type,
        emailId: data.email.id,
        to: data.email.to,
        subject: data.email.subject
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
