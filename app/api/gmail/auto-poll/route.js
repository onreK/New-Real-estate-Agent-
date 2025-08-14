// app/api/gmail/auto-poll/route.js - MINIMAL WORKING VERSION
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // Call the monitor API to check emails
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const monitorUrl = `${protocol}://${host}/api/gmail/monitor`;
    
    console.log('🔗 AUTO-POLL: Calling monitor at:', monitorUrl);
    
    // Check for emails
    const checkResponse = await fetch(monitorUrl, {
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

    if (!checkResponse.ok) {
      console.error('❌ Monitor check failed:', checkResponse.status);
      return NextResponse.json({ 
        success: false, 
        error: 'Monitor check failed'
      }, { status: 500 });
    }

    const emailData = await checkResponse.json();
    const emails = emailData.emails || [];
    console.log('📊 Found', emails.length, 'emails');

    let responsesGenerated = 0;

    // Process up to 2 emails
    for (let i = 0; i < Math.min(emails.length, 2); i++) {
      const email = emails[i];
      console.log(`📧 Processing email ${i + 1}: "${email.subject}"`);
      
      try {
        // Send AI response
        const respondResponse = await fetch(monitorUrl, {
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

        if (respondResponse.ok) {
          responsesGenerated++;
          console.log(`✅ Sent response for email ${i + 1}`);
        }
        
        // Wait 1 second between responses
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Failed to respond to email ${i + 1}:`, err.message);
      }
    }

    console.log('🎉 AUTO-POLL completed:', responsesGenerated, 'responses sent');
    
    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed',
      results: {
        emailsChecked: emails.length,
        responsesGenerated: responsesGenerated,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ AUTO-POLL error:', error.message);
    return NextResponse.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API',
    status: 'Active',
    version: '1.0-minimal'
  });
}
