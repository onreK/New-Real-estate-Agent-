// COMPLETE app/api/gmail/auto-poll/route.js - IMPROVED ERROR HANDLING
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Store last check times to avoid spam
const lastCheckTimes = new Map();

export async function POST(request) {
  console.log('🔄 AUTO-POLL: Starting email check and response cycle');
  
  try {
    // Get email address from request
    let emailAddress;
    try {
      const body = await request.json();
      emailAddress = body.emailAddress;
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError.message);
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request body' 
      }, { status: 400 });
    }
    
    if (!emailAddress) {
      console.log('❌ No email address provided');
      return NextResponse.json({ 
        success: false,
        error: 'Email address required' 
      }, { status: 400 });
    }

    console.log('📧 AUTO-POLL: Checking emails for:', emailAddress);

    // Simple rate limiting
    const lastCheck = lastCheckTimes.get(emailAddress);
    const now = Date.now();
    const minInterval = 25 * 1000; // 25 seconds to be safe

    if (lastCheck && (now - lastCheck) < minInterval) {
      console.log('⚠️ AUTO-POLL: Rate limited - too recent');
      return NextResponse.json({ 
        success: true, 
        message: 'Rate limited - too recent',
        nextCheckIn: Math.round((minInterval - (now - lastCheck)) / 1000) + ' seconds'
      });
    }

    // Update last check time
    lastCheckTimes.set(emailAddress, now);

    // Step 1: Check for emails using monitor API
    console.log('📬 AUTO-POLL: Step 1 - Checking for new emails...');
    
    let emailsFound = 0;
    let responsesGenerated = 0;
    
    try {
      // 🎯 IMPROVED: Better URL building and error handling
      const currentUrl = new URL(request.url);
      const monitorUrl = `${currentUrl.protocol}//${currentUrl.host}/api/gmail/monitor`;
      
      console.log('🔗 AUTO-POLL: Calling monitor API at:', monitorUrl);
      console.log('🔗 AUTO-POLL: Request headers:', {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') ? 'Present' : 'Missing'
      });
      
      const monitorResponse = await fetch(monitorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
          // 🎯 NEW: Add user agent and other headers
          'User-Agent': request.headers.get('user-agent') || 'Auto-Poll-Bot/1.0'
        },
        body: JSON.stringify({
          action: 'check',
          emailAddress: emailAddress
        })
      });

      console.log('📊 AUTO-POLL: Monitor API response status:', monitorResponse.status);
      console.log('📊 AUTO-POLL: Monitor API response headers:', {
        'content-type': monitorResponse.headers.get('content-type'),
        'content-length': monitorResponse.headers.get('content-length')
      });

      if (!monitorResponse.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await monitorResponse.json();
          errorDetails = errorData.error || errorData.message || errorData.details || 'Monitor API error';
          console.error('❌ AUTO-POLL: Monitor API JSON error:', errorData);
        } catch (jsonError) {
          const errorText = await monitorResponse.text();
          errorDetails = errorText || 'Failed to parse error response';
          console.error('❌ AUTO-POLL: Monitor API text error:', errorText);
        }
        
        console.error('❌ AUTO-POLL: Monitor API failed:', monitorResponse.status, monitorResponse.statusText);
        
        // 🎯 IMPROVED: Return more helpful error info
        return NextResponse.json({ 
          success: false, 
          error: `Monitor API failed: ${monitorResponse.status}`,
          details: errorDetails,
          debugInfo: {
            monitorUrl,
            emailAddress,
            timestamp: new Date().toISOString()
          }
        }, { status: 500 });
      }

      let emailData;
      try {
        emailData = await monitorResponse.json();
        console.log('📊 AUTO-POLL: Monitor API response data:', {
          success: emailData.success,
          emailCount: emailData.emails?.length || 0,
          message: emailData.message
        });
      } catch (jsonError) {
        console.error('❌ AUTO-POLL: Failed to parse monitor response as JSON:', jsonError.message);
        return NextResponse.json({ 
          success: false, 
          error: 'Monitor API returned invalid JSON',
          details: jsonError.message
        }, { status: 500 });
      }

      emailsFound = emailData.emails?.length || 0;
      console.log('📊 AUTO-POLL: Found', emailsFound, 'emails');

      // Step 2: If we have emails, try to respond to them
      if (emailData.emails && emailData.emails.length > 0) {
        console.log('🤖 AUTO-POLL: Step 2 - Generating AI responses...');
        
        // Only process first 2 emails to prevent overwhelming
        const emailsToProcess = emailData.emails.slice(0, 2);
        console.log('📝 AUTO-POLL: Processing', emailsToProcess.length, 'emails');
        
        for (let i = 0; i < emailsToProcess.length; i++) {
          const email = emailsToProcess[i];
          
          try {
            console.log(`🚀 AUTO-POLL: Processing email ${i + 1}/${emailsToProcess.length}: "${email.subject}"`);
            
            const responseResult = await fetch(monitorUrl, {
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
                console.log(`✅ AUTO-POLL: AI response sent for email ${i + 1}: "${email.subject}"`);
              } else {
                console.log(`⚠️ AUTO-POLL: Response failed for email ${i + 1}:`, responseData.error);
              }
            } else {
              console.log(`⚠️ AUTO-POLL: Response API failed for email ${i + 1}:`, responseResult.status);
            }
            
            // Small delay between responses to prevent overwhelming
            if (i < emailsToProcess.length - 1) {
              console.log('⏱️ AUTO-POLL: Waiting 2 seconds before next response...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
          } catch (emailError) {
            console.error(`❌ AUTO-POLL: Error processing email ${i + 1}:`, emailError.message);
          }
        }
      } else {
        console.log('📭 AUTO-POLL: No new emails found');
      }
      
    } catch (monitorError) {
      console.error('❌ AUTO-POLL: Monitor step failed:', monitorError.message);
      console.error('❌ AUTO-POLL: Monitor error stack:', monitorError.stack);
      
      // 🎯 IMPROVED: More detailed error reporting
      return NextResponse.json({ 
        success: false, 
        error: 'Email monitoring failed',
        details: monitorError.message,
        errorType: monitorError.name || 'UnknownError',
        debugInfo: {
          emailAddress,
          timestamp: new Date().toISOString(),
          step: 'monitor_api_call'
        }
      }, { status: 500 });
    }

    console.log('🎉 AUTO-POLL: Cycle completed successfully');
    console.log(`📊 AUTO-POLL: Final results - Emails: ${emailsFound}, Responses: ${responsesGenerated}`);
    
    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed successfully',
      results: {
        emailsChecked: emailsFound,
        responsesGenerated: responsesGenerated,
        timestamp: new Date().toISOString(),
        emailAddress: emailAddress
      }
    });

  } catch (error) {
    console.error('❌ AUTO-POLL: Unexpected error:', error);
    console.error('❌ AUTO-POLL: Error stack:', error.stack);
    
    // 🎯 IMPROVED: Comprehensive error reporting
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed',
      details: error.message,
      errorType: error.name || 'UnknownError',
      debugInfo: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API - Enhanced Error Handling Version',
    status: 'Active',
    description: 'Checks Gmail and sends AI responses automatically with improved debugging',
    version: '2.1-enhanced-errors',
    features: [
      '✅ Enhanced error logging and debugging',
      '📧 Email checking via monitor API',
      '🤖 AI response generation',
      '⏱️ Rate limiting (25s minimum)',
      '📊 Detailed error reporting',
      '🔍 Better internal API call handling'
    ]
  });
}
