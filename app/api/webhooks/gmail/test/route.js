// app/api/webhooks/gmail/test/route.js
// TEST ENDPOINT - Manually trigger the Gmail webhook to test lead creation
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 🧪 TEST ENDPOINT - Send a test email to the webhook
 * This simulates an incoming email to test lead creation
 */
export async function POST(request) {
  try {
    console.log('🧪 Test email webhook trigger');
    
    // Get test data from request or use defaults
    const testData = await request.json().catch(() => ({}));
    
    // Create test email data
    const testEmail = {
      from: testData.from || 'Test User <testuser@example.com>',
      to: testData.to || 'your-business@gmail.com',
      subject: testData.subject || 'Test Email - Interest in Your Services',
      body: testData.body || 'Hi, I\'m interested in learning more about your AI services. Can you send me pricing information? This is urgent as we need to make a decision by end of week. Please call me at 555-0123. Thanks!',
      messageId: testData.messageId || `test_${Date.now()}`,
      threadId: testData.threadId || `thread_${Date.now()}`,
      userId: testData.userId || process.env.TEST_USER_ID || 'user_test',
      gmailAccountEmail: testData.gmailAccountEmail || 'your-business@gmail.com'
    };
    
    console.log('📧 Sending test email to webhook:', testEmail);
    
    // Call the main webhook endpoint
    const webhookUrl = new URL('/api/webhooks/gmail', request.url);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailData: testEmail
      })
    });
    
    const result = await webhookResponse.json();
    
    if (!webhookResponse.ok) {
      throw new Error(result.error || 'Webhook failed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test email processed successfully',
      test_email: testEmail,
      webhook_result: result
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * 🔍 GET endpoint - Show test instructions
 */
export async function GET(request) {
  return NextResponse.json({
    message: 'Gmail Webhook Test Endpoint',
    instructions: {
      method: 'POST',
      url: '/api/webhooks/gmail/test',
      description: 'Send a test email to the webhook to test lead creation',
      body: {
        from: 'Sender Name <sender@example.com> (optional)',
        to: 'your-business@gmail.com (optional)',
        subject: 'Email subject (optional)',
        body: 'Email content (optional)',
        userId: 'Your clerk user ID (optional)',
        gmailAccountEmail: 'Your Gmail account (optional)'
      },
      example: {
        from: 'John Doe <john@company.com>',
        subject: 'Interested in your services',
        body: 'Hi, I would like to learn more about your pricing. Please send me information.'
      }
    },
    test_now: 'Send a POST request to this endpoint to test lead creation'
  });
}
