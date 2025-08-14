// app/api/gmail/auto-poll/route.js - SUPER SIMPLE VERSION
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Store last check times to avoid duplicate processing
const lastCheckTimes = new Map();

export async function POST(request) {
  console.log('🔄 Auto-poll API called');
  
  try {
    // Get email address from request
    const body = await request.json();
    const { emailAddress } = body;
    
    if (!emailAddress) {
      console.log('❌ No email address provided');
      return NextResponse.json({ 
        success: false,
        error: 'Email address required' 
      }, { status: 400 });
    }

    console.log('📧 Auto-polling for:', emailAddress);

    // Simple rate limiting
    const lastCheck = lastCheckTimes.get(emailAddress);
    const now = Date.now();
    const minInterval = 30 * 1000; // 30 seconds

    if (lastCheck && (now - lastCheck) < minInterval) {
      console.log('⚠️ Rate limited - too recent');
      return NextResponse.json({ 
        success: true, 
        message: 'Rate limited - too recent',
        nextCheckIn: Math.round((minInterval - (now - lastCheck)) / 1000) + ' seconds'
      });
    }

    // Update last check time
    lastCheckTimes.set(emailAddress, now);

    // Step 1: Check for emails using monitor API
    console.log('📬 Step 1: Checking for emails...');
    
    const monitorResponse = await fetch(`${request.url.replace('/auto-poll', '/monitor')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        action: 'check',
        emailAddress: emailAddress
      })
    });

    if (!monitorResponse.ok) {
      console.error('❌ Monitor API failed:', monitorResponse.status);
      return NextResponse.json({ 
        success: false, 
        error: `Monitor API failed: ${monitorResponse.status}` 
      }, { status: 500 });
    }

    const emailData = await monitorResponse.json();
    console.log('📊 Emails found:', emailData.emails?.length || 0);

    let responsesGenerated = 0;
    
    // Step 2: If we have emails, try to respond to first 2
    if (emailData.emails && emailData.emails.length > 0) {
      console.log('🤖 Step 2: Generating AI responses...');
      
      // Only process first 2 emails to prevent overwhelming
      const emailsToProcess = emailData.emails.slice(0, 2);
      
      for (const email of emailsToProcess) {
        try {
          console.log(`🚀 Responding to: ${email.subject}`);
          
          const responseResult = await fetch(`${request.url.replace('/auto-poll', '/monitor')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              action: 'respond',
              emailAddress: emailAddress,
              emailId: email.id,
              actualSend: true
            })
          });

          if (responseResult.ok) {
            const responseData = await responseResult.json();
            if (responseData.success) {
              responsesGenerated++;
              console.log(`✅ Response sent for: ${email.subject}`);
            } else {
              console.log(`⚠️ Response failed: ${responseData.error}`);
            }
          } else {
            console.log(`⚠️ Response API failed: ${responseResult.status}`);
          }
          
          // Small delay between responses
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (emailError) {
          console.error(`❌ Error responding to email:`, emailError.message);
        }
      }
    }

    console.log('🎉 Auto-poll completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed',
      results: {
        emailsChecked: emailData.emails?.length || 0,
        responsesGenerated: responsesGenerated,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Auto-poll error:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API - Super Simple Version',
    status: 'Active',
    description: 'Bypasses auth and just calls monitor API directly',
    version: '1.0-simple'
  });
}
