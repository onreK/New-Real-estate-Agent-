// app/api/gmail/auto-poll/route.js - FIXED VERSION WITH PROPER AI CHECKING
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Store last check times to avoid spam
const lastCheckTimes = new Map();

export async function POST(request) {
  console.log('🔄 AUTO-POLL: Starting email check and response cycle');
  
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      console.log('❌ AUTO-POLL: No user found');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

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

    // CHECK AI SETTINGS FROM DATABASE
    console.log('🔍 AUTO-POLL: Checking AI settings for user:', user.id);
    
    const settingsResult = await query(`
      SELECT 
        enable_ai_responses,
        ai_model,
        custom_instructions,
        tone
      FROM email_settings
      WHERE customer_id = $1
    `, [user.id]);

    const aiSettings = settingsResult.rows[0];
    
    if (!aiSettings || !aiSettings.enable_ai_responses) {
      console.log('⚠️ AUTO-POLL: AI responses are disabled in settings');
      return NextResponse.json({ 
        success: true,
        message: 'AI responses are disabled',
        aiEnabled: false,
        checkComplete: true
      });
    }

    console.log('✅ AUTO-POLL: AI responses are enabled, proceeding with checks');

    // Simple rate limiting
    const lastCheck = lastCheckTimes.get(emailAddress);
    const now = Date.now();
    const minInterval = 25 * 1000; // 25 seconds to be safe

    if (lastCheck && (now - lastCheck) < minInterval) {
      console.log('⏱️ AUTO-POLL: Rate limited - too recent');
      return NextResponse.json({ 
        success: true, 
        message: 'Rate limited - too recent',
        nextCheckIn: Math.round((minInterval - (now - lastCheck)) / 1000) + ' seconds',
        aiEnabled: true
      });
    }

    // Update last check time
    lastCheckTimes.set(emailAddress, now);

    // Step 1: Check for emails using monitor API
    console.log('📬 AUTO-POLL: Step 1 - Checking for new emails...');
    
    let emailsFound = 0;
    let responsesGenerated = 0;
    
    try {
      // Build the monitor URL from the current request URL
      const currentUrl = new URL(request.url);
      const monitorUrl = `${currentUrl.protocol}//${currentUrl.host}/api/gmail/monitor`;
      
      console.log('🔗 AUTO-POLL: Calling monitor API at:', monitorUrl);
      
      const monitorResponse = await fetch(monitorUrl, {
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
        console.error('❌ AUTO-POLL: Monitor API failed:', monitorResponse.status, monitorResponse.statusText);
        return NextResponse.json({ 
          success: false, 
          error: `Monitor API failed: ${monitorResponse.status}`,
          details: monitorResponse.statusText
        }, { status: 500 });
      }

      const emailData = await monitorResponse.json();
      emailsFound = emailData.emails?.length || 0;
      console.log('📊 AUTO-POLL: Found', emailsFound, 'emails');

      // Step 2: If we have emails AND AI is enabled, try to respond to them
      if (emailData.emails && emailData.emails.length > 0) {
        console.log('🤖 AUTO-POLL: Step 2 - Generating AI responses...');
        
        // Only process first 3 emails to prevent overwhelming
        const emailsToProcess = emailData.emails.slice(0, 3);
        console.log('📝 AUTO-POLL: Processing', emailsToProcess.length, 'emails');
        
        for (let i = 0; i < emailsToProcess.length; i++) {
          const email = emailsToProcess[i];
          
          try {
            console.log(`🚀 AUTO-POLL: Processing email ${i + 1}/${emailsToProcess.length}: "${email.subject}"`);
            
            // Send AI response request with AI settings
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
                actualSend: true,
                aiSettings: {
                  model: aiSettings.ai_model || 'gpt-4o-mini',
                  customInstructions: aiSettings.custom_instructions || '',
                  tone: aiSettings.tone || 'professional'
                }
              })
            });

            if (responseResult.ok) {
              const responseData = await responseResult.json();
              if (responseData.success) {
                responsesGenerated++;
                console.log(`✅ AUTO-POLL: AI response sent for email ${i + 1}: "${email.subject}"`);
                
                // Log the event for analytics
                try {
                  await query(`
                    INSERT INTO ai_analytics_events (
                      customer_id,
                      event_type,
                      event_data
                    ) VALUES ($1, $2, $3)
                  `, [
                    user.id,
                    'email_responded',
                    JSON.stringify({
                      email_id: email.id,
                      subject: email.subject,
                      from: email.from,
                      timestamp: new Date().toISOString()
                    })
                  ]);
                } catch (analyticsError) {
                  console.log('Analytics logging failed:', analyticsError.message);
                }
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
      return NextResponse.json({ 
        success: false, 
        error: 'Email monitoring failed',
        details: monitorError.message 
      }, { status: 500 });
    }

    console.log('🎉 AUTO-POLL: Cycle completed successfully');
    console.log(`📊 AUTO-POLL: Final results - Emails: ${emailsFound}, Responses: ${responsesGenerated}`);
    
    // Update analytics summary
    if (responsesGenerated > 0) {
      try {
        await query(`
          INSERT INTO customer_analytics_summary (
            customer_id,
            total_emails_processed,
            total_responses_sent,
            last_activity
          ) VALUES ($1, $2, $3, NOW())
          ON CONFLICT (customer_id) 
          DO UPDATE SET
            total_emails_processed = customer_analytics_summary.total_emails_processed + $2,
            total_responses_sent = customer_analytics_summary.total_responses_sent + $3,
            last_activity = NOW()
        `, [user.id, emailsFound, responsesGenerated]);
      } catch (updateError) {
        console.log('Analytics update failed:', updateError.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auto-poll completed successfully',
      aiEnabled: true,
      results: {
        emailsChecked: emailsFound,
        responsesGenerated: responsesGenerated,
        timestamp: new Date().toISOString(),
        emailAddress: emailAddress
      }
    });

  } catch (error) {
    console.error('❌ AUTO-POLL: Unexpected error:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API - Fixed Version',
    status: 'Active',
    description: 'Checks Gmail and sends AI responses automatically',
    version: '3.0-unified',
    features: [
      '✅ Checks AI settings from database',
      '✅ Unified control system',
      '📧 Email checking via monitor API',
      '🤖 AI response generation',
      '⏱️ Rate limiting (25s minimum)',
      '📊 Analytics tracking',
      '🔒 User authentication'
    ]
  });
}
