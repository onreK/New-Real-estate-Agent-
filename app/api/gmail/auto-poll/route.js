// app/api/gmail/auto-poll/route.js - FIXED VERSION - Automatic Gmail polling for AI responses
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

// Store last check times to avoid duplicate processing
const lastCheckTimes = new Map();

export async function POST(request) {
  try {
    // 🎯 FIXED: Better error handling and logging
    console.log('🔄 Auto-poll started');
    
    // Check if user is authenticated
    let user;
    try {
      user = await currentUser();
    } catch (authError) {
      console.error('❌ Auth error:', authError.message);
      return NextResponse.json({ 
        success: false,
        error: 'Authentication failed',
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📄 Auto-polling Gmail for user:', user.emailAddresses?.[0]?.emailAddress);

    // 🎯 FIXED: Parse request body safely
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('❌ Request parsing error:', parseError.message);
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request body' 
      }, { status: 400 });
    }

    const { emailAddress } = requestData;

    // 🎯 FIXED: Better Gmail status check with error handling
    let gmailStatusResponse;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const statusUrl = `${baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl}/api/gmail/status`;
      
      gmailStatusResponse = await fetch(statusUrl, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
    } catch (fetchError) {
      console.error('❌ Gmail status fetch error:', fetchError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check Gmail status',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!gmailStatusResponse.ok) {
      console.log('❌ Gmail status check failed:', gmailStatusResponse.status);
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected',
        statusCode: gmailStatusResponse.status 
      }, { status: 400 });
    }

    let gmailStatus;
    try {
      gmailStatus = await gmailStatusResponse.json();
    } catch (jsonError) {
      console.error('❌ Gmail status JSON parse error:', jsonError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail status response invalid' 
      }, { status: 500 });
    }
    
    if (!gmailStatus.connected) {
      console.log('❌ Gmail not connected');
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected' 
      }, { status: 400 });
    }

    const gmailEmail = gmailStatus.connection?.email || emailAddress;
    console.log('📧 Checking Gmail for:', gmailEmail);

    // Check if we've checked recently (avoid spam)
    const lastCheck = lastCheckTimes.get(gmailEmail);
    const now = Date.now();
    const minInterval = 30 * 1000; // 30 seconds minimum between checks (reduced from 2 minutes)

    if (lastCheck && (now - lastCheck) < minInterval) {
      console.log('⚠️ Skipping check - too recent');
      return NextResponse.json({ 
        success: true, 
        message: 'Check skipped - too recent',
        lastCheck: new Date(lastCheck).toISOString(),
        nextCheckIn: Math.round((minInterval - (now - lastCheck)) / 1000) + ' seconds'
      });
    }

    // Update last check time
    lastCheckTimes.set(gmailEmail, now);

    // 🎯 FIXED: Better monitor API call with error handling
    let monitorResponse;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const monitorUrl = `${baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl}/api/gmail/monitor`;
      
      monitorResponse = await fetch(monitorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          action: 'check',
          emailAddress: gmailEmail,
          autoMode: true // Flag to indicate this is automatic
        })
      });
    } catch (monitorFetchError) {
      console.error('❌ Monitor API fetch error:', monitorFetchError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check emails',
        details: monitorFetchError.message 
      }, { status: 500 });
    }

    if (!monitorResponse.ok) {
      console.error('❌ Monitor API failed:', monitorResponse.status, monitorResponse.statusText);
      
      // Try to get error details
      let errorDetails = `HTTP ${monitorResponse.status}`;
      try {
        const errorData = await monitorResponse.text();
        errorDetails += `: ${errorData}`;
      } catch (e) {
        // Ignore parse errors for error details
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check emails',
        details: errorDetails 
      }, { status: 500 });
    }

    let emails;
    try {
      emails = await monitorResponse.json();
    } catch (emailsJsonError) {
      console.error('❌ Monitor response JSON parse error:', emailsJsonError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid monitor response' 
      }, { status: 500 });
    }

    console.log('📊 Auto-poll results:', {
      emailsFound: emails.emails?.length || 0,
      timestamp: new Date().toISOString()
    });

    // If we found new emails and AI responses are enabled, process them
    if (emails.emails && emails.emails.length > 0) {
      console.log('📨 Found new emails, checking for AI responses...');
      
      // 🎯 FIXED: Better AI settings check
      let aiEnabled = true; // Default to true if we can't check
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const aiSettingsUrl = `${baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl}/api/customer/ai-settings`;
        
        const aiSettingsResponse = await fetch(aiSettingsUrl, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        });

        if (aiSettingsResponse.ok) {
          const aiSettings = await aiSettingsResponse.json();
          aiEnabled = aiSettings.settings?.enable_ai_responses !== false;
          console.log('🤖 AI responses enabled:', aiEnabled);
        } else {
          console.log('⚠️ Could not check AI settings, defaulting to enabled');
        }
      } catch (aiError) {
        console.error('⚠️ AI settings check failed:', aiError.message);
        console.log('⚠️ Defaulting AI responses to enabled');
      }

      if (aiEnabled) {
        // Process emails that need AI responses
        let responsesGenerated = 0;
        
        // 🎯 FIXED: Limit to prevent overwhelming the system
        const emailsToProcess = emails.emails.slice(0, 3); // Limit to 3 emails per poll
        
        for (const email of emailsToProcess) {
          try {
            console.log(`🚀 Generating AI response for email: ${email.subject}`);
            
            const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';
            const respondUrl = `${baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl}/api/gmail/monitor`;
            
            const responseResult = await fetch(respondUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
              },
              body: JSON.stringify({
                action: 'respond',
                emailAddress: gmailEmail,
                emailId: email.id,
                actualSend: true, // Actually send the response
                autoMode: true // Flag to indicate this is automatic
              })
            });

            if (responseResult.ok) {
              const responseData = await responseResult.json();
              if (responseData.success) {
                responsesGenerated++;
                console.log(`✅ AI response sent for: ${email.subject}`);
              } else {
                console.log(`⚠️ AI response failed for ${email.subject}:`, responseData.error);
              }
            } else {
              console.log(`⚠️ AI response API failed for ${email.subject}:`, responseResult.status);
            }
            
            // Small delay between responses to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            
          } catch (emailError) {
            console.error(`❌ Error processing email ${email.id}:`, emailError.message);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Auto-poll completed successfully',
          results: {
            emailsChecked: emails.emails.length,
            responsesGenerated: responsesGenerated,
            aiEnabled: aiEnabled,
            timestamp: new Date().toISOString(),
            emailsProcessed: emailsToProcess.length
          }
        });
      } else {
        console.log('🚫 AI responses disabled, skipping auto-responses');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed - no new emails or AI disabled',
      results: {
        emailsChecked: emails.emails?.length || 0,
        responsesGenerated: 0,
        aiEnabled: aiEnabled,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Auto-poll error:', error);
    
    // 🎯 FIXED: Better error response
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Allow GET for testing
export async function GET() {
  try {
    return NextResponse.json({
      message: 'Gmail Auto-Poll API',
      description: 'Automatically checks Gmail and sends AI responses',
      status: 'Active',
      version: '2.0-fixed',
      features: [
        '🔄 Automatic email checking',
        '🤖 AI response generation',
        '📧 Actual email sending',
        '⏰ Rate limiting (30s minimum)',
        '🛡️ Enhanced error handling',
        '📊 Detailed logging',
        '🎯 URL environment detection'
      ],
      usage: {
        method: 'POST',
        body: '{ "emailAddress": "your@email.com" }',
        description: 'Triggers automatic Gmail check and AI responses'
      }
    });
  } catch (error) {
    console.error('❌ Auto-poll GET error:', error);
    return NextResponse.json({ 
      error: 'Auto-poll status check failed',
      details: error.message 
    }, { status: 500 });
  }
}
