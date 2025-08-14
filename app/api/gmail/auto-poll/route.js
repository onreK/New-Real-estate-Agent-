// app/api/gmail/auto-poll/route.js - Automatic Gmail polling for AI responses
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

// Store last check times to avoid duplicate processing
const lastCheckTimes = new Map();

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Auto-polling Gmail for user:', user.emailAddresses?.[0]?.emailAddress);

    // Get connected Gmail accounts
    const gmailStatusResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/gmail/status`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (!gmailStatusResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected' 
      }, { status: 400 });
    }

    const gmailStatus = await gmailStatusResponse.json();
    
    if (!gmailStatus.connected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected' 
      }, { status: 400 });
    }

    const gmailEmail = gmailStatus.connection.email;
    console.log('📧 Checking Gmail for:', gmailEmail);

    // Check if we've checked recently (avoid spam)
    const lastCheck = lastCheckTimes.get(gmailEmail);
    const now = Date.now();
    const minInterval = 2 * 60 * 1000; // 2 minutes minimum between checks

    if (lastCheck && (now - lastCheck) < minInterval) {
      console.log('⚠️ Skipping check - too recent');
      return NextResponse.json({ 
        success: true, 
        message: 'Check skipped - too recent',
        lastCheck: new Date(lastCheck).toISOString()
      });
    }

    // Update last check time
    lastCheckTimes.set(gmailEmail, now);

    // Check for new emails using existing monitor API
    const monitorResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/gmail/monitor`, {
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

    if (!monitorResponse.ok) {
      console.error('❌ Monitor API failed:', monitorResponse.status);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check emails' 
      }, { status: 500 });
    }

    const emails = await monitorResponse.json();
    console.log('📊 Auto-poll results:', {
      emailsFound: emails.emails?.length || 0,
      timestamp: new Date().toISOString()
    });

    // If we found new emails and AI responses are enabled, process them
    if (emails.emails && emails.emails.length > 0) {
      console.log('📨 Found new emails, checking for AI responses...');
      
      // Check if AI responses are enabled
      const aiSettingsResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/customer/ai-settings`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });

      let aiEnabled = true; // Default to true if we can't check
      
      if (aiSettingsResponse.ok) {
        const aiSettings = await aiSettingsResponse.json();
        aiEnabled = aiSettings.settings?.enable_ai_responses !== false;
        console.log('🤖 AI responses enabled:', aiEnabled);
      }

      if (aiEnabled) {
        // Process emails that need AI responses
        let responsesGenerated = 0;
        
        for (const email of emails.emails.slice(0, 3)) { // Limit to 3 emails per poll
          try {
            console.log(`🚀 Generating AI response for email: ${email.subject}`);
            
            const responseResult = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/gmail/monitor`, {
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
              }
            }
            
            // Small delay between responses
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`❌ Error processing email ${email.id}:`, error);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Auto-poll completed',
          results: {
            emailsChecked: emails.emails.length,
            responsesGenerated: responsesGenerated,
            aiEnabled: aiEnabled,
            timestamp: new Date().toISOString()
          }
        });
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
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll failed',
      details: error.message 
    }, { status: 500 });
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Poll API',
    description: 'Automatically checks Gmail and sends AI responses',
    status: 'Active'
  });
}
