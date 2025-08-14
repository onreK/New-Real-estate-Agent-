// app/api/gmail/monitor/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/database';
import { checkEmailFilter } from '@/lib/email-filtering';
import { generateGmailResponse } from '@/lib/ai-service';

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Safe processing limits
const EMAIL_LIMITS = {
  MAX_FETCH: 30,      // Maximum emails to fetch from Gmail
  MAX_PROCESS: 20,    // Maximum emails to process in one request
  BATCH_SIZE: 5,      // Process emails in batches
  TIMEOUT_MS: 8000    // Timeout per email operation
};

// Helper: Save Gmail connection to database
async function saveGmailConnectionToDatabase(connection) {
  try {
    const checkQuery = `
      SELECT id FROM gmail_connections 
      WHERE gmail_email = $1 
      LIMIT 1
    `;
    const existing = await query(checkQuery, [connection.email]);
    
    if (existing.rows.length > 0) {
      const updateQuery = `
        UPDATE gmail_connections 
        SET access_token = $1, refresh_token = $2, token_expiry = $3, 
            status = 'connected', last_monitored = CURRENT_TIMESTAMP
        WHERE gmail_email = $4
        RETURNING id
      `;
      const result = await query(updateQuery, [
        connection.accessToken,
        connection.refreshToken,
        connection.tokenExpiry,
        connection.email
      ]);
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Database save error:', error);
    return null;
  }
}

// Helper: Get customer settings including filter settings
async function getCustomerSettings(emailAddress) {
  try {
    const settingsQuery = `
      SELECT c.id as customer_id, c.business_name, c.clerk_user_id,
             es.auto_archive_spam, es.block_mass_emails, es.personal_only,
             es.skip_auto_generated, es.blacklist_emails, es.whitelist_emails,
             es.priority_keywords, es.enable_ai_responses, es.knowledge_base,
             es.custom_instructions, es.hot_lead_keywords, es.tone
      FROM gmail_connections gc
      JOIN customers c ON gc.user_id = c.clerk_user_id
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE gc.gmail_email = $1
      LIMIT 1
    `;
    
    const result = await query(settingsQuery, [emailAddress]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching customer settings:', error);
    return null;
  }
}

// Helper: Save conversation to database
async function saveConversationToDatabase(customerId, connectionId, emailData) {
  try {
    const insertQuery = `
      INSERT INTO gmail_conversations 
      (customer_id, gmail_connection_id, gmail_thread_id, gmail_message_id,
       sender_email, sender_name, subject, first_message_text, 
       latest_message_text, status, created_at, last_activity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
      ON CONFLICT (gmail_thread_id) 
      DO UPDATE SET 
        latest_message_text = $9,
        last_activity = NOW()
      RETURNING id
    `;
    
    const result = await query(insertQuery, [
      customerId,
      connectionId,
      emailData.threadId,
      emailData.id,
      emailData.fromEmail,
      emailData.fromName,
      emailData.subject,
      emailData.body?.substring(0, 500),
      emailData.body?.substring(0, 500)
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to save conversation:', error);
    return null;
  }
}

// Helper: Save message to database
async function saveMessageToDatabase(conversationId, messageData) {
  try {
    const insertQuery = `
      INSERT INTO gmail_messages 
      (conversation_id, gmail_message_id, thread_id, sender_type, 
       sender_email, recipient_email, subject, body_text, body_html, 
       snippet, message_id_header, sent_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (gmail_message_id) DO NOTHING
      RETURNING id
    `;
    
    const result = await query(insertQuery, [
      conversationId,
      messageData.gmail_message_id,
      messageData.thread_id,
      messageData.sender_type,
      messageData.sender_email,
      messageData.recipient_email,
      messageData.subject,
      messageData.body_text,
      messageData.body_html,
      messageData.snippet,
      messageData.message_id_header,
      messageData.sent_at
    ]);
    
    if (result.rows.length > 0) {
      console.log('Message saved to database:', result.rows[0].id);
      return result.rows[0];
    } else {
      console.log('Message already exists in database');
      return null;
    }
  } catch (error) {
    console.error('Failed to save message to database:', error.message);
    return null;
  }
}

// Helper: Timeout wrapper for email processing
async function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR WITH EMAIL FILTERING v3.0 ===');
  
  try {
    const requestTimeout = setTimeout(() => {
      console.error('⏰ Request timed out after 30 seconds');
    }, 30000);

    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send Mode:', actualSend);
    console.log('🔍 Email Filtering: ENABLED');
    
    if (!emailAddress) {
      clearTimeout(requestTimeout);
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 });
    }

    // Get connection from memory
    let connection = null;
    let dbConnectionId = null;
    
    if (global.gmailConnections) {
      console.log('🔍 Checking memory storage...');
      connection = global.gmailConnections.get(emailAddress) || 
                   Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    }
    
    // Fallback for kernojunk@gmail.com
    if (!connection && emailAddress === 'kernojunk@gmail.com') {
      console.log('🎯 Using fallback connection for kernojunk@gmail.com');
      connection = {
        email: 'kernojunk@gmail.com',
        accessToken: 'will-refresh',
        refreshToken: 'will-refresh',
        tokenExpiry: Date.now() - 1000
      };
    }
    
    if (!connection) {
      clearTimeout(requestTimeout);
      console.log('❌ No connection found for:', emailAddress);
      return NextResponse.json({ 
        error: `Gmail connection not found for ${emailAddress}`,
        suggestion: 'Please reconnect Gmail'
      }, { status: 404 });
    }

    console.log('✅ Gmail connection found:', connection.email);

    // Set up OAuth and refresh tokens
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('✅ Tokens refreshed successfully');
      
      connection.accessToken = credentials.access_token;
      connection.tokenExpiry = credentials.expiry_date;
      
      const dbConnection = await saveGmailConnectionToDatabase(connection);
      if (dbConnection) {
        dbConnectionId = dbConnection.id;
      }
      
    } catch (refreshError) {
      clearTimeout(requestTimeout);
      console.error('⚠️ Token refresh failed:', refreshError.message);
      return NextResponse.json({ 
        error: 'Gmail connection expired. Please reconnect.',
        suggestion: 'Visit /api/auth/google to reauthenticate'
      }, { status: 401 });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let result;
    if (action === 'check') {
      result = await checkForNewEmails(gmail, connection, dbConnectionId);
    } else if (action === 'respond') {
      result = await respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend, emailAddress);
    } else {
      clearTimeout(requestTimeout);
      return NextResponse.json({ 
        error: 'Invalid action. Use "check" or "respond"' 
      }, { status: 400 });
    }

    clearTimeout(requestTimeout);
    return result;

  } catch (error) {
    console.error('❌ Gmail monitor error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Gmail monitor failed',
      details: error.message,
      suggestion: 'Please try again or contact support if the issue persists'
    }, { status: 500 });
  }
}

async function checkForNewEmails(gmail, connection, dbConnectionId) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Checking for new emails with filtering...');

    const response = await withTimeout(
      gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: EMAIL_LIMITS.MAX_FETCH
      }),
      10000,
      'Gmail API list messages'
    );

    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} unread emails`);

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unread emails found',
        emails: [],
        connectedEmail: connection.email,
        totalFound: 0,
        totalProcessed: 0,
        filteringEnabled: true,
        processingTime: Date.now() - startTime
      });
    }

    const emailDetails = [];
    let processedCount = 0;
    let filteredCount = 0;

    const emailsToProcess = messages.slice(0, EMAIL_LIMITS.MAX_PROCESS);
    console.log(`🔄 Processing ${emailsToProcess.length} emails...`);

    // Get customer settings for filtering
    const customerSettings = await getCustomerSettings(connection.email);

    for (let i = 0; i < emailsToProcess.length; i += EMAIL_LIMITS.BATCH_SIZE) {
      const batch = emailsToProcess.slice(i, i + EMAIL_LIMITS.BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (message) => {
          try {
            const messageData = await withTimeout(
              gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
              }),
              8000,
              `Get message ${message.id}`
            );

            const headers = messageData.data.payload.headers;
            const fromHeader = headers.find(h => h.name === 'From');
            const subjectHeader = headers.find(h => h.name === 'Subject');
            const dateHeader = headers.find(h => h.name === 'Date');
            const listIdHeader = headers.find(h => h.name === 'List-Id');
            const precedenceHeader = headers.find(h => h.name === 'Precedence');
            const listUnsubscribeHeader = headers.find(h => h.name === 'List-Unsubscribe');

            const fromEmail = fromHeader?.value || '';
            const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
            const customerEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;
            const customerName = fromEmail.replace(/<.*>/, '').trim() || customerEmail.split('@')[0];

            // Get email body
            let body = '';
            let bodyHtml = '';
            try {
              if (messageData.data.payload.body?.data) {
                body = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
              } else if (messageData.data.payload.parts) {
                const textPart = messageData.data.payload.parts.find(part => 
                  part.mimeType === 'text/plain'
                );
                const htmlPart = messageData.data.payload.parts.find(part => 
                  part.mimeType === 'text/html'
                );
                
                if (textPart?.body?.data) {
                  body = Buffer.from(textPart.body.data, 'base64').toString();
                }
                if (htmlPart?.body?.data) {
                  bodyHtml = Buffer.from(htmlPart.body.data, 'base64').toString();
                }
              }
              
              if (!body && !bodyHtml) {
                body = messageData.data.snippet || '';
              }
            } catch (bodyError) {
              body = messageData.data.snippet || '';
            }

            // CHECK EMAIL FILTERS
            if (customerSettings) {
              const isAutoGenerated = !!(
                precedenceHeader?.value?.toLowerCase().includes('bulk') ||
                precedenceHeader?.value?.toLowerCase().includes('list') ||
                fromEmail.toLowerCase().includes('noreply') ||
                fromEmail.toLowerCase().includes('no-reply') ||
                fromEmail.toLowerCase().includes('donotreply') ||
                fromEmail.toLowerCase().includes('notification') ||
                fromEmail.toLowerCase().includes('alert')
              );
              
              const isMassEmail = !!(
                listIdHeader ||
                listUnsubscribeHeader ||
                body.toLowerCase().includes('unsubscribe') ||
                body.toLowerCase().includes('email preferences') ||
                body.toLowerCase().includes('manage subscriptions')
              );

              const filterResult = await checkEmailFilter({
                from: fromEmail,
                subject: subjectHeader?.value || '',
                body: body,
                isAutoGenerated,
                isMassEmail
              }, customerSettings);

              if (filterResult.shouldFilter) {
                console.log(`🚫 Email filtered from ${fromEmail}: ${filterResult.reason}`);
                filteredCount++;
                
                // Optionally archive the filtered email
                if (customerSettings.auto_archive_spam !== false) {
                  try {
                    await gmail.users.messages.modify({
                      userId: 'me',
                      id: message.id,
                      requestBody: {
                        removeLabelIds: ['INBOX']
                      }
                    });
                    console.log(`🗂️ Archived filtered email`);
                  } catch (archiveError) {
                    console.error('Failed to archive:', archiveError);
                  }
                }
                
                // Skip adding to email list
                return;
              }
            }

            // Email passed filters - add to list
            emailDetails.push({
              id: message.id,
              threadId: messageData.data.threadId,
              from: fromHeader?.value || 'Unknown',
              fromEmail: customerEmail,
              fromName: customerName,
              subject: subjectHeader?.value || 'No Subject',
              date: dateHeader?.value || 'Unknown',
              body: body.substring(0, 300),
              fullBody: body,
              snippet: messageData.data.snippet,
              receivedTime: new Date(parseInt(messageData.data.internalDate)).toLocaleString(),
              isUnread: messageData.data.labelIds?.includes('UNREAD') || false
            });

            processedCount++;

            // Save to database if we have customer settings
            if (customerSettings && dbConnectionId) {
              try {
                const conversation = await saveConversationToDatabase(
                  customerSettings.customer_id,
                  dbConnectionId,
                  {
                    id: message.id,
                    threadId: messageData.data.threadId,
                    fromEmail: customerEmail,
                    fromName: customerName,
                    subject: subjectHeader?.value,
                    body: body
                  }
                );

                if (conversation) {
                  await saveMessageToDatabase(conversation.id, {
                    gmail_message_id: message.id,
                    thread_id: messageData.data.threadId,
                    sender_type: 'customer',
                    sender_email: customerEmail,
                    recipient_email: connection.email,
                    subject: subjectHeader?.value,
                    body_text: body,
                    body_html: bodyHtml,
                    snippet: messageData.data.snippet,
                    message_id_header: headers.find(h => h.name === 'Message-ID')?.value,
                    sent_at: new Date(parseInt(messageData.data.internalDate))
                  });
                }
              } catch (dbError) {
                console.error('Database save failed (continuing):', dbError.message);
              }
            }

          } catch (messageError) {
            console.error(`Error processing message:`, messageError);
          }
        })
      );
    }

    console.log(`✅ Processed ${processedCount} emails, filtered ${filteredCount}`);

    return NextResponse.json({
      success: true,
      message: `Found ${messages.length} emails, processed ${processedCount}, filtered ${filteredCount}`,
      emails: emailDetails,
      connectedEmail: connection.email,
      totalFound: messages.length,
      totalProcessed: processedCount,
      totalFiltered: filteredCount,
      filteringEnabled: true,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error checking emails:', error);
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Email check timed out',
        details: 'Try again with fewer emails.',
        suggestion: 'The system is processing safely but hit timeout limits.'
      }, { status: 408 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check emails',
      details: error.message,
      suggestion: 'Please try again.'
    }, { status: 500 });
  }
}

// UPDATED: respondToEmail with FILTERING CHECK
async function respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend, emailAddress) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Checking if email should receive AI response...');

  try {
    // Get original email
    const messageData = await withTimeout(
      gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      }),
      8000,
      'Get original message'
    );

    const headers = messageData.data.payload.headers;
    const fromHeader = headers.find(h => h.name === 'From');
    const subjectHeader = headers.find(h => h.name === 'Subject');
    const listIdHeader = headers.find(h => h.name === 'List-Id');
    const precedenceHeader = headers.find(h => h.name === 'Precedence');
    const listUnsubscribeHeader = headers.find(h => h.name === 'List-Unsubscribe');

    // Extract email info
    const fromEmail = fromHeader?.value || '';
    const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
    const replyToEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;
    const subject = subjectHeader?.value || '';

    // Get email body
    let originalBody = '';
    try {
      if (messageData.data.payload.body?.data) {
        originalBody = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
      } else if (messageData.data.payload.parts) {
        const textPart = messageData.data.payload.parts.find(part => 
          part.mimeType === 'text/plain'
        );
        if (textPart?.body?.data) {
          originalBody = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }
      
      if (!originalBody) {
        originalBody = messageData.data.snippet || 'Original email content unavailable';
      }
    } catch (bodyError) {
      originalBody = messageData.data.snippet || 'Email content unavailable';
    }

    // 🔍 CRITICAL: CHECK EMAIL FILTERS BEFORE RESPONDING
    const customerSettings = await getCustomerSettings(emailAddress);
    
    if (customerSettings) {
      // Check if email is auto-generated or mass email
      const isAutoGenerated = !!(
        precedenceHeader?.value?.toLowerCase().includes('bulk') ||
        precedenceHeader?.value?.toLowerCase().includes('list') ||
        fromEmail.toLowerCase().includes('noreply') ||
        fromEmail.toLowerCase().includes('no-reply') ||
        fromEmail.toLowerCase().includes('donotreply') ||
        fromEmail.toLowerCase().includes('notification') ||
        fromEmail.toLowerCase().includes('alert') ||
        fromEmail.toLowerCase().includes('mailer-daemon') ||
        fromEmail.toLowerCase().includes('postmaster')
      );
      
      const isMassEmail = !!(
        listIdHeader ||
        listUnsubscribeHeader ||
        originalBody.toLowerCase().includes('unsubscribe') ||
        originalBody.toLowerCase().includes('email preferences') ||
        originalBody.toLowerCase().includes('manage subscriptions') ||
        originalBody.toLowerCase().includes('update your preferences')
      );

      // Apply email filtering
      const filterResult = await checkEmailFilter({
        from: fromEmail,
        subject: subject,
        body: originalBody,
        isAutoGenerated,
        isMassEmail
      }, customerSettings);

      // If email should be filtered, DON'T RESPOND
      if (filterResult.shouldFilter) {
        console.log(`🚫 NOT responding to filtered email from ${fromEmail}: ${filterResult.reason}`);
        
        return NextResponse.json({
          success: false,
          filtered: true,
          reason: filterResult.reason,
          message: `Email from ${replyToEmail} was filtered (${filterResult.reason}). No response sent.`,
          filterType: filterResult.filterType || 'automatic',
          isAutoGenerated,
          isMassEmail
        });
      }
      
      console.log(`✅ Email from ${fromEmail} passed filters - proceeding with AI response`);
    }

    // GENERATE AI RESPONSE (only if email passed filters)
    console.log('🧠 Generating AI response for approved email...');
    
    const startTime = Date.now();
    let aiResult;
    
    try {
      // Get conversation from database if exists
      let conversationId = null;
      if (dbConnectionId && customerSettings) {
        const convQuery = `
          SELECT id FROM gmail_conversations 
          WHERE gmail_thread_id = $1 
          LIMIT 1
        `;
        const convResult = await query(convQuery, [messageData.data.threadId]);
        if (convResult.rows.length > 0) {
          conversationId = convResult.rows[0].id;
        }
      }
      
      // Generate AI response using centralized service
      aiResult = await withTimeout(
        generateGmailResponse({
          originalBody,
          subject,
          fromEmail: replyToEmail,
          customPrompt: customMessage || customerSettings?.custom_instructions || '',
          customerData: customerSettings,
          conversationId
        }),
        15000,
        'Generate AI response'
      );
      
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError.message);
      
      // Fallback response
      aiResult = {
        response: customMessage || `Thank you for your email. We've received your message and will respond with more detailed information shortly.\n\nBest regards,\n${customerSettings?.business_name || 'Team'}`,
        success: false,
        fallback: true
      };
    }

    const responseTime = Date.now() - startTime;
    console.log(`⏱️ AI response generated in ${responseTime}ms`);

    // Get email body for actual send
    const emailBody = aiResult.response || aiResult.aiResponse || 'Thank you for your message.';

    // ACTUALLY SEND THE EMAIL if actualSend is true
    if (actualSend) {
      console.log('📤 Sending AI response to:', replyToEmail);
      
      try {
        const message = [
          `To: ${replyToEmail}`,
          `Subject: Re: ${subject}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          emailBody
        ].join('\n');

        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
            threadId: messageData.data.threadId
          }
        });

        console.log('✅ AI response sent successfully!');
        
        // Mark original as read
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });

        // Save to database
        if (dbConnectionId && customerSettings) {
          try {
            const convQuery = `
              INSERT INTO gmail_conversations 
              (customer_id, gmail_connection_id, gmail_thread_id, 
               sender_email, subject, status, ai_responded, created_at)
              VALUES ($1, $2, $3, $4, $5, 'active', true, NOW())
              ON CONFLICT (gmail_thread_id) 
              DO UPDATE SET 
                ai_responded = true,
                last_activity = NOW()
              RETURNING id
            `;
            
            await query(convQuery, [
              customerSettings.customer_id,
              dbConnectionId,
              messageData.data.threadId,
              replyToEmail,
              subject
            ]);
          } catch (dbError) {
            console.error('Database save failed:', dbError);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'AI response sent successfully',
          response: emailBody,
          sentTo: replyToEmail,
          threadId: messageData.data.threadId,
          responseTime: responseTime,
          filtered: false,
          actualSend: true
        });

      } catch (sendError) {
        console.error('Failed to send email:', sendError);
        return NextResponse.json({
          success: false,
          error: 'Failed to send email',
          details: sendError.message,
          response: emailBody
        }, { status: 500 });
      }
      
    } else {
      // PREVIEW MODE - don't actually send
      console.log('👁️ Preview mode - not sending email');
      
      return NextResponse.json({
        success: true,
        message: 'AI response generated (preview mode)',
        response: emailBody,
        wouldReplyTo: replyToEmail,
        threadId: messageData.data.threadId,
        responseTime: responseTime,
        filtered: false,
        preview: true,
        actualSend: false
      });
    }

  } catch (error) {
    console.error('❌ Error in respondToEmail:', error);
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Response generation timed out',
        details: 'Please try again.'
      }, { status: 408 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate response',
      details: error.message
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Monitor API v3.0 with Email Filtering',
    status: 'Active',
    version: '3.0-filtered',
    features: [
      '🔍 Email filtering before AI responses',
      '🚫 Blocks noreply, donotreply, notifications',
      '📧 Filters mass emails and newsletters',
      '✅ Respects whitelist/blacklist rules',
      '🗑️ Auto-archives spam if enabled',
      '🤖 Only responds to personal emails',
      '💾 Database tracking for all conversations',
      '⚡ Safe processing limits',
      '⏰ Timeout protection'
    ],
    endpoints: {
      check: 'POST with action: "check"',
      respond: 'POST with action: "respond", emailId required'
    }
  });
}
