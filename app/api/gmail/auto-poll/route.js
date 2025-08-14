// app/api/gmail/auto-poll/route.js - FIXED MONITOR URL VERSION
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Store last check times to avoid spam
const lastCheckTimes = new Map();

export async function POST(request) {
  console.log('🔄 AUTO-POLL: Starting email check and response cycle');
  
  try {
    // Get request body
    const body = await request.json();
    const emailAddress = body.emailAddress;
    
    if (!emailAddress) {
      return NextResponse.json({ 
        success: false,
        error: 'Email address required' 
      }, { status: 400 });
    }

    console.log('📧 AUTO-POLL: Checking emails for:', emailAddress);

    // Simple rate limiting (25 seconds minimum)
    const lastCheck = lastCheckTimes.get(emailAddress);
    const now = Date.now();
    const minInterval = 25 * 1000;

    if (lastCheck && (now - lastCheck) < minInterval) {
      const waitTime = Math.round((minInterval - (now - lastCheck)) / 1000);
      console.log(`⏱️ Rate limited - wait ${waitTime}s`);
      return NextResponse.json({ 
        success: true, 
        message: 'Rate limited - too recent',
        nextCheckIn: waitTime + ' seconds'
      });
    }

    // Update last check time
    lastCheckTimes.set(emailAddress, now);

    // Build the correct monitor URL
    // Use the origin from the request if available
    const origin = request.headers.get('origin') || 
                   `https://${request.headers.get('host')}` || 
                   'https://bizzybotai.com';
    
    const monitorUrl = `${origin}/api/gmail/monitor`;
    console.log('🔗 Calling monitor at:', monitorUrl);
    
    // Step 1: Check for emails
    let emails = [];
    try {
      const checkResponse = await fetch(monitorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward all cookies for authentication
          'Cookie': request.headers.get('cookie') || '',
          // Add additional headers that might be needed
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
          'User-Agent': 'BizzyBot-AutoPoll/1.0'
        },
        body: JSON.stringify({
          action: 'check',
          emailAddress: emailAddress
        })
      });

      console.log('📬 Monitor check response status:', checkResponse.status);

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error('❌ Monitor check failed:', checkResponse.status, errorText);
        
        // Try to parse error
        try {
          const errorData = JSON.parse(errorText);
          return NextResponse.json({ 
            success: false, 
            error: `Monitor check failed: ${errorData.error || checkResponse.status}`
          });
        } catch {
          return NextResponse.json({ 
            success: false, 
            error: `Monitor check failed with status ${checkResponse.status}`
          });
        }
      }

      const emailData = await checkResponse.json();
      emails = emailData.emails || [];
      console.log('📊 Found', emails.length, 'emails to process');
      
    } catch (checkError) {
      console.error('❌ Error checking emails:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check emails: ' + checkError.message
      });
    }

    // Step 2: Send AI responses to emails
    let responsesGenerated = 0;
    
    if (emails.length > 0) {
      console.log('🤖 Processing emails with AI responses...');
      
      // Process up to 2 emails at a time
      const emailsToProcess = emails.slice(0, 2);
      
      for (let i = 0; i < emailsToProcess.length; i++) {
        const email = emailsToProcess[i];
        console.log(`📧 Processing email ${i + 1}/${emailsToProcess.length}: "${email.subject}"`);
        
        try {
          const respondResponse = await fetch(monitorUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
              'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
              'User-Agent': 'BizzyBot-AutoPoll/1.0'
            },
            body: JSON.stringify({
              action: 'respond',
              emailAddress: emailAddress,
              emailId: email.id,
              actualSend: true
            })
          });

          if (respondResponse.ok) {
            const responseData = await respondResponse.json();
            if (responseData.success) {
              responsesGenerated++;
              console.log(`✅ AI response sent for email ${i + 1}`);
            } else {
              console.log(`⚠️ Response not sent for email ${i + 1}:`, responseData.error);
            }
          } else {
            console.error(`❌ Failed to respond to email ${i + 1}:`, respondResponse.status);
          }
          
          // Wait 1 second between responses
          if (i < emailsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (respondError) {
          console.error(`❌ Error responding to email ${i + 1}:`, respondError.message);
        }
      }
    } else {
      console.log('📭 No new emails to process');
    }

    console.log('🎉 AUTO-POLL completed successfully');
    console.log(`📊 Results: ${emails.length} emails checked, ${responsesGenerated} responses sent`);
    
    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed successfully',
      results: {
        emailsChecked: emails.length,
        responsesGenerated: responsesGenerated,
        timestamp: new Date().toISOString(),
        emailAddress: emailAddress
      }
    });

  } catch (error) {
    console.error('❌ AUTO-POLL unexpected error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed: ' + error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API',
    status: 'Active',
    version: '1.0-minimal',
    description: 'Checks Gmail and sends AI responses automatically'
  });
}
