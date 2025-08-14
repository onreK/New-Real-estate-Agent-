// app/api/gmail/monitor/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { query } from '@/lib/database.js';
import { checkEmailFilter } from '@/lib/email-filtering.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Safe processing limits
const EMAIL_LIMITS = {
  MAX_FETCH: 30,
  MAX_PROCESS: 20,
  BATCH_SIZE: 5,
  TIMEOUT_MS: 25000
};

// Helper: Get customer AI settings and knowledge base
async function getCustomerAISettings(customerEmail) {
  try {
    console.log('📚 Loading AI settings for:', customerEmail);
    
    // Get customer and settings
    const customerQuery = `
      SELECT c.id as customer_id, c.business_name, c.clerk_user_id,
             es.knowledge_base, es.custom_instructions, es.tone,
             es.expertise, es.specialties, es.hot_lead_keywords,
             es.auto_archive_spam, es.block_mass_emails, es.personal_only,
             es.skip_auto_generated, es.blacklist_emails, es.whitelist_emails,
             es.priority_keywords, es.enable_ai_responses
      FROM gmail_connections gc
      JOIN customers c ON gc.user_id = c.clerk_user_id
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE gc.gmail_email = $1
      LIMIT 1
    `;
    
    const result = await query(customerQuery, [customerEmail]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('✅ Found settings for:', row.business_name);
      console.log('📖 Knowledge base length:', row.knowledge_base?.length || 0);
      console.log('📝 Custom instructions:', row.custom_instructions ? 'Yes' : 'No');
      return row;
    }
    
    console.log('⚠️ No settings found, using defaults');
    return null;
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    return null;
  }
}

// Helper: Build AI prompt with business knowledge
function buildAIPrompt(aiSettings, customerEmail) {
  const businessName = aiSettings?.business_name || 'Our Business';
  
  let prompt = `You are a professional AI assistant representing ${businessName}.`;
  
  // Add knowledge base if available
  if (aiSettings?.knowledge_base && aiSettings.knowledge_base.trim()) {
    prompt += `\n\nBUSINESS INFORMATION:\n${aiSettings.knowledge_base}`;
  }
  
  // Add custom instructions if available
  if (aiSettings?.custom_instructions && aiSettings.custom_instructions.trim()) {
    prompt += `\n\nCUSTOM INSTRUCTIONS:\n${aiSettings.custom_instructions}`;
  }
  
  // Add tone guidance
  const tone = aiSettings?.tone || 'professional';
  prompt += `\n\nCOMMUNICATION STYLE: Respond in a ${tone} tone.`;
  
  // Add expertise if available
  if (aiSettings?.expertise || aiSettings?.specialties) {
    prompt += `\nEXPERTISE: ${aiSettings.expertise || ''} ${aiSettings.specialties || ''}`.trim();
  }
  
  prompt += `\n\nINSTRUCTIONS:
- Answer customer questions using the business information provided above
- Be specific and helpful, using details from the business information
- If asked about something not in the business information, politely say you'll need to check
- Keep responses concise but informative
- Always maintain a ${tone} tone
- End with a helpful next step or call to action when appropriate`;

  return prompt;
}

// Helper: Save Gmail connection to database
async function saveGmailConnectionToDatabase(connection) {
  try {
    const result = await query(`
      INSERT INTO gmail_connections (
        user_id, gmail_email, access_token, refresh_token, token_expiry, status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, gmail_email) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        status = 'connected',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      connection.user_id || 'anonymous',
      connection.email,
      connection.accessToken,
      connection.refreshToken,
      connection.tokenExpiry,
      'connected'
    ]);
    
    console.log('✅ Gmail connection saved to database');
    return result.rows[0];
  } catch (error) {
    console.error('⚠️ Failed to save connection:', error.message);
    return null;
  }
}

// Helper: Save conversation to database
async function saveConversationToDatabase(connectionId, threadId, customerEmail, customerName, subject) {
  try {
    const result = await query(`
      INSERT INTO gmail_conversations (
        gmail_connection_id, thread_id, customer_email, customer_name, subject
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (gmail_connection_id, thread_id) 
      DO UPDATE SET 
        customer_name = COALESCE(EXCLUDED.customer_name, gmail_conversations.customer_name),
        subject = COALESCE(EXCLUDED.subject, gmail_conversations.subject),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [connectionId, threadId, customerEmail, customerName, subject]);
    
    return result.rows[0];
  } catch (error) {
    console.error('⚠️ Failed to save conversation:', error.message);
    return null;
  }
}

// Helper: Save message to database
async function saveMessageToDatabase(conversationId, messageData) {
  try {
    const result = await query(`
      INSERT INTO gmail_messages (
        conversation_id, gmail_message_id, thread_id, sender_type,
        sender_email, recipient_email, subject, body_text, body_html,
        snippet, message_id_header, in_reply_to, is_ai_response,
        ai_model, sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (gmail_message_id) DO NOTHING
      RETURNING *
    `, [
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
      messageData.in_reply_to,
      messageData.is_ai_response || false,
      messageData.ai_model,
      messageData.sent_at
    ]);
    
    if (result.rows.length > 0) {
      console.log('✅ Message saved to database');
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('⚠️ Failed to save message:', error.message);
    return null;
  }
}

// Helper: Timeout wrapper
async function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// MAIN POST HANDLER
export async function POST(request) {
  console.log('📧 === GMAIL MONITOR v3.0 WITH FILTERING ===');
  
  try {
    const requestTimeout = setTimeout(() => {
      console.error('⏰ Request timed out after 30 seconds');
    }, 30000);

    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send:', actualSend);
    
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
      connection = global.gmailConnections.get(emailAddress) || 
                   Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    }
    
    // Fallback for kernojunk@gmail.com
    if (!connection && emailAddress === 'kernojunk@gmail.com') {
      connection = {
        email: 'kernojunk@gmail.com',
        accessToken: 'will-refresh',
        refreshToken: 'will-refresh',
        tokenExpiry: Date.now() - 1000
      };
    }
    
    if (!connection) {
      clearTimeout(requestTimeout);
      return NextResponse.json({ 
        error: `Gmail connection not found for ${emailAddress}`,
        suggestion: 'Please reconnect Gmail'
      }, { status: 404 });
    }

    // Set up OAuth and refresh tokens
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('✅ Tokens refreshed');
      
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
      result = await respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend);
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
      details: error.message
    }, { status: 500 });
  }
}

// CHECK FOR NEW EMAILS WITH FILTERING
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
        totalFiltered: 0
      });
    }

    // Get customer settings for filtering
    const customerSettings = await getCustomerAISettings(connection.email);
    
    const emailDetails = [];
    let processedCount = 0;
    let filteredCount = 0;

    const emailsToProcess = messages.slice(0, EMAIL_LIMITS.MAX_PROCESS);

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
            try {
              if (messageData.data.payload.body?.data) {
                body = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
              } else if (messageData.data.payload.parts) {
                const textPart = messageData.data.payload.parts.find(part => 
                  part.mimeType === 'text/plain'
                );
                if (textPart?.body?.data) {
                  body = Buffer.from(textPart.body.data, 'base64').toString();
                }
              }
              if (!body) {
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
                body.toLowerCase().includes('email preferences')
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
                
                // Archive filtered email if enabled
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
                
                return; // Skip adding to email list
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

            // Save to database
            if (dbConnectionId) {
              try {
                const conversation = await saveConversationToDatabase(
                  dbConnectionId,
                  messageData.data.threadId,
                  customerEmail,
                  customerName,
                  subjectHeader?.value
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
                    snippet: messageData.data.snippet,
                    message_id_header: headers.find(h => h.name === 'Message-ID')?.value,
                    sent_at: new Date(parseInt(messageData.data.internalDate))
                  });
                }
              } catch (dbError) {
                console.error('Database save failed:', dbError.message);
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
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error checking emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check emails',
      details: error.message
    }, { status: 500 });
  }
}

// RESPOND TO EMAIL WITH FILTERING & FIXED AI
async function respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Processing email for AI response...');

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
    const messageIdHeader = headers.find(h => h.name === 'Message-ID');
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

    // Get customer settings for filtering and AI
    const customerSettings = await getCustomerAISettings(connection.email);
    
    // CHECK EMAIL FILTERS BEFORE RESPONDING
    if (customerSettings) {
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
        originalBody.toLowerCase().includes('email preferences')
      );

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
      
      console.log(`✅ Email from ${fromEmail} passed filters - generating AI response`);
    }

    // GENERATE AI RESPONSE
    console.log('🧠 Generating AI response with business knowledge...');
    
    const startTime = Date.now();
    let aiText = '';
    
    try {
      // Build system prompt with business knowledge
      const systemPrompt = buildAIPrompt(customerSettings, connection.email);
      
      console.log('📝 System prompt includes:');
      console.log('- Business name:', customerSettings?.business_name || 'Not set');
      console.log('- Knowledge base:', customerSettings?.knowledge_base ? 'Yes' : 'No');
      console.log('- Custom instructions:', customerSettings?.custom_instructions ? 'Yes' : 'No');
      
      // Generate AI response
      const aiResponse = await withTimeout(
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: customMessage || originalBody
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
        12000,
        'OpenAI API call'
      );

      aiText = aiResponse.choices[0]?.message?.content || '';
      
      if (!aiText) {
        throw new Error('No response generated from AI');
      }
      
      console.log('✅ AI response generated successfully');
      console.log('📝 Response preview:', aiText.substring(0, 150) + '...');
      
    } catch (aiError) {
      console.error('❌ AI generation failed:', aiError.message);
      
      // Fallback response
      const businessName = customerSettings?.business_name || 'our team';
      aiText = `Thank you for reaching out to ${businessName}. We've received your message and will provide you with detailed information shortly.

Best regards,
${businessName}`;
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Response generated in ${responseTime}ms`);

    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    // SEND OR PREVIEW EMAIL
    if (actualSend) {
      console.log('📤 Sending AI response to:', replyToEmail);
      
      const rawMessage = [
        `From: ${connection.email}`,
        `To: ${replyToEmail}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${messageIdHeader?.value || ''}`,
        `References: ${messageIdHeader?.value || ''}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        aiText
      ].join('\r\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendResponse = await withTimeout(
        gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
            threadId: messageData.data.threadId
          }
        }),
        10000,
        'Email send'
      );

      // Mark original as read
      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
      } catch (markError) {
        console.warn('⚠️ Failed to mark as read:', markError.message);
      }

      // Save to database
      if (dbConnectionId) {
        try {
          const convResult = await query(`
            SELECT * FROM gmail_conversations 
            WHERE gmail_connection_id = $1 AND thread_id = $2
            LIMIT 1
          `, [dbConnectionId, messageData.data.threadId]);

          if (convResult.rows.length > 0) {
            await saveMessageToDatabase(convResult.rows[0].id, {
              gmail_message_id: sendResponse.data.id,
              thread_id: messageData.data.threadId,
              sender_type: 'ai',
              sender_email: connection.email,
              recipient_email: replyToEmail,
              subject: replySubject,
              body_text: aiText,
              is_ai_response: true,
              ai_model: 'gpt-4o-mini',
              sent_at: new Date()
            });
          }
        } catch (dbError) {
          console.error('⚠️ Database save failed:', dbError.message);
        }
      }

      console.log('🎉 Email sent successfully!');

      return NextResponse.json({
        success: true,
        message: 'AI response sent successfully!',
        response: aiText,
        sentTo: replyToEmail,
        threadId: messageData.data.threadId,
        responseTime: responseTime,
        filtered: false,
        actualSent: true,
        knowledgeBaseUsed: !!(customerSettings?.knowledge_base?.trim()),
        customInstructionsUsed: !!(customerSettings?.custom_instructions?.trim())
      });

    } else {
      // PREVIEW MODE
      console.log('👁️ Preview mode - not sending email');
      
      return NextResponse.json({
        success: true,
        message: 'AI response generated (preview mode)',
        response: aiText,
        wouldReplyTo: replyToEmail,
        threadId: messageData.data.threadId,
        responseTime: responseTime,
        filtered: false,
        preview: true,
        actualSend: false,
        knowledgeBaseUsed: !!(customerSettings?.knowledge_base?.trim()),
        customInstructionsUsed: !!(customerSettings?.custom_instructions?.trim())
      });
    }

  } catch (error) {
    console.error('❌ Error in respondToEmail:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate response',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Monitor API v3.0',
    status: 'Active',
    version: '3.0-complete',
    features: [
      '🔍 Email filtering (blocks noreply, spam, newsletters)',
      '🤖 AI responses with business knowledge base',
      '📝 Custom instructions support',
      '✅ Whitelist/blacklist rules',
      '🗂️ Auto-archives filtered emails',
      '💾 Database tracking',
      '⚡ Safe processing limits',
      '⏰ Timeout protection'
    ],
    endpoints: {
      check: 'POST with action: "check"',
      respond: 'POST with action: "respond", emailId required'
    }
  });
}
