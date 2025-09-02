// app/api/gmail/monitor/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/database.js';
import { checkEmailFilter } from '@/lib/email-filtering.js';
import { generateGmailResponse } from '@/lib/ai-service.js';
// 🎯 NEW IMPORT: Add the leads service for contact management
import { createOrUpdateContact, trackLeadEventWithContact, updateLeadScoring } from '@/lib/leads-service.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

// Helper: Get customer AI settings for filtering
async function getCustomerAISettings(customerEmail) {
  try {
    console.log('📚 Loading AI settings for filtering:', customerEmail);
    
    // Get customer and settings for filtering purposes
    const customerQuery = `
      SELECT c.id as customer_id, c.business_name, c.clerk_user_id,
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
      console.log('✅ Found settings for filtering');
      return row;
    }
    
    console.log('⚠️ No settings found, using defaults');
    return null;
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    return null;
  }
}

// 🎯 NEW HELPER: Check business rules (blacklist/whitelist/priority)
function checkBusinessRules(fromEmail, subject, body, settings) {
  const result = {
    isBlacklisted: false,
    isWhitelisted: false,
    isPriority: false,
    priorityKeywords: [],
    reason: null
  };
  
  if (!settings) {
    return result;
  }
  
  const fromEmailLower = fromEmail.toLowerCase();
  
  // Check BLACKLIST
  if (settings.blacklist_emails && Array.isArray(settings.blacklist_emails)) {
    for (const blacklisted of settings.blacklist_emails) {
      if (!blacklisted) continue;
      
      const blacklistedLower = blacklisted.toLowerCase();
      
      if (blacklistedLower.startsWith('@')) {
        // Domain check
        const domain = blacklistedLower.slice(1);
        if (fromEmailLower.includes(domain) || fromEmailLower.endsWith(domain)) {
          result.isBlacklisted = true;
          result.reason = `Blacklisted domain: ${blacklisted}`;
          console.log(`🚫 Email from ${fromEmail} is blacklisted (domain: ${blacklisted})`);
          break;
        }
      } else if (fromEmailLower === blacklistedLower || fromEmailLower.includes(`<${blacklistedLower}>`) || fromEmailLower.includes(blacklistedLower)) {
        // Email check
        result.isBlacklisted = true;
        result.reason = `Blacklisted email: ${blacklisted}`;
        console.log(`🚫 Email from ${fromEmail} is blacklisted (exact match: ${blacklisted})`);
        break;
      }
    }
  }
  
  // Check WHITELIST
  if (settings.whitelist_emails && Array.isArray(settings.whitelist_emails)) {
    for (const whitelisted of settings.whitelist_emails) {
      if (!whitelisted) continue;
      
      const whitelistedLower = whitelisted.toLowerCase();
      
      if (whitelistedLower.startsWith('@')) {
        // Domain check
        const domain = whitelistedLower.slice(1);
        if (fromEmailLower.includes(domain) || fromEmailLower.endsWith(domain)) {
          result.isWhitelisted = true;
          console.log(`✅ Email from ${fromEmail} is whitelisted (domain: ${whitelisted})`);
          break;
        }
      } else if (fromEmailLower === whitelistedLower || fromEmailLower.includes(`<${whitelistedLower}>`) || fromEmailLower.includes(whitelistedLower)) {
        // Email check
        result.isWhitelisted = true;
        console.log(`✅ Email from ${fromEmail} is whitelisted (exact match: ${whitelisted})`);
        break;
      }
    }
  }
  
  // Check PRIORITY KEYWORDS
  if (settings.priority_keywords && Array.isArray(settings.priority_keywords)) {
    const contentToCheck = `${subject || ''} ${body || ''}`.toLowerCase();
    
    for (const keyword of settings.priority_keywords) {
      if (!keyword) continue;
      
      if (contentToCheck.includes(keyword.toLowerCase())) {
        result.isPriority = true;
        result.priorityKeywords.push(keyword);
      }
    }
    
    if (result.isPriority) {
      console.log(`🔥 Priority keywords detected: ${result.priorityKeywords.join(', ')}`);
    }
  }
  
  return result;
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
  console.log('📧 === GMAIL MONITOR v3.2 WITH CUSTOM RESPONSE SUPPORT ===');
  
  try {
    const requestTimeout = setTimeout(() => {
      console.error('⏰ Request timed out after 30 seconds');
    }, 30000);

    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false, customResponse } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send:', actualSend);
    console.log('✏️ Has Custom Response:', !!customResponse);
    
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
      // 🎯 UPDATED: Pass customResponse to the respond function
      result = await respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend, customResponse);
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

// CHECK FOR NEW EMAILS WITH FILTERING AND LEAD CREATION
async function checkForNewEmails(gmail, connection, dbConnectionId) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Checking for new emails with filtering and lead tracking...');

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
    let blacklistedCount = 0;
    let leadsCreated = 0;

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

            // 🎯 CHECK BUSINESS RULES FIRST
            if (customerSettings) {
              const businessRules = checkBusinessRules(
                fromEmail,
                subjectHeader?.value || '',
                body,
                customerSettings
              );
              
              // If blacklisted and NOT whitelisted, skip completely
              if (businessRules.isBlacklisted && !businessRules.isWhitelisted) {
                console.log(`🚫 Blacklisted email from ${fromEmail} - archiving`);
                blacklistedCount++;
                filteredCount++;
                
                // Archive blacklisted email
                try {
                  await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id,
                    requestBody: {
                      removeLabelIds: ['UNREAD', 'INBOX']
                    }
                  });
                  console.log(`🗂️ Archived blacklisted email`);
                } catch (archiveError) {
                  console.error('Failed to archive:', archiveError);
                }
                
                return; // Skip this email completely
              }
              
              // 🎯 NEW: CREATE/UPDATE CONTACT FOR NON-BLACKLISTED EMAILS
              if (customerSettings.customer_id) {
                try {
                  console.log(`📇 Creating/updating contact for ${customerEmail}`);
                  
                  const contactResult = await createOrUpdateContact(customerSettings.customer_id, {
                    email: customerEmail,
                    name: customerName,
                    source_channel: 'gmail'
                  });
                  
                  if (contactResult.success) {
                    leadsCreated++;
                    console.log(`✅ Contact ${contactResult.action}: ${contactResult.contact.id}`);
                    
                    // Track the email received event
                    await trackLeadEventWithContact(
                      customerSettings.customer_id,
                      contactResult.contact.id,
                      {
                        type: 'email_received',
                        channel: 'gmail',
                        message: body.substring(0, 500),
                        metadata: JSON.stringify({
                          subject: subjectHeader?.value,
                          from: customerEmail,
                          gmail_message_id: message.id,
                          thread_id: messageData.data.threadId
                        })
                      }
                    );
                    
                    // Update lead scoring
                    await updateLeadScoring(customerSettings.customer_id, contactResult.contact.id);
                  }
                } catch (contactError) {
                  console.error('❌ Failed to create/update contact:', contactError);
                }
              }
              
              // If whitelisted, skip other filters
              if (businessRules.isWhitelisted) {
                console.log(`✅ Whitelisted email from ${fromEmail} - bypassing filters`);
              } else {
                // CHECK OTHER EMAIL FILTERS (spam, mass email, etc.)
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
            }

            // Email passed all filters - add to list
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

    console.log(`✅ Processed ${processedCount} emails, filtered ${filteredCount}, created/updated ${leadsCreated} leads`);

    return NextResponse.json({
      success: true,
      message: `Found ${messages.length} emails, processed ${processedCount}, filtered ${filteredCount}, leads: ${leadsCreated}`,
      emails: emailDetails,
      connectedEmail: connection.email,
      totalFound: messages.length,
      totalProcessed: processedCount,
      totalFiltered: filteredCount,
      blacklistedCount: blacklistedCount,
      leadsCreatedOrUpdated: leadsCreated,
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

// 🎯 UPDATED: RESPOND TO EMAIL WITH CUSTOM RESPONSE SUPPORT
async function respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend, customResponse) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Processing email for response...');
  console.log('✏️ Using custom response:', !!customResponse);

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
    const customerName = fromEmail.replace(/<.*>/, '').trim() || replyToEmail.split('@')[0];
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

    // Get customer settings for filtering
    const customerSettings = await getCustomerAISettings(connection.email);
    
    // 🎯 CREATE/UPDATE CONTACT BEFORE RESPONDING
    let contactId = null;
    if (customerSettings && customerSettings.customer_id) {
      try {
        console.log(`📇 Creating/updating contact for ${replyToEmail} before responding`);
        
        const contactResult = await createOrUpdateContact(customerSettings.customer_id, {
          email: replyToEmail,
          name: customerName,
          source_channel: 'gmail'
        });
        
        if (contactResult.success) {
          contactId = contactResult.contact.id;
          console.log(`✅ Contact ${contactResult.action}: ${contactId}`);
          
          // Track that we received an email from this contact
          await trackLeadEventWithContact(
            customerSettings.customer_id,
            contactId,
            {
              type: 'email_received',
              channel: 'gmail',
              message: originalBody.substring(0, 500),
              metadata: JSON.stringify({
                subject: subject,
                from: replyToEmail,
                gmail_message_id: emailId,
                thread_id: messageData.data.threadId
              })
            }
          );
        }
      } catch (contactError) {
        console.error('❌ Failed to create/update contact:', contactError);
      }
    }
    
    // 🎯 CHECK BUSINESS RULES
    if (customerSettings) {
      const businessRules = checkBusinessRules(
        fromEmail,
        subject,
        originalBody,
        customerSettings
      );
      
      // If blacklisted and NOT whitelisted, don't respond
      if (businessRules.isBlacklisted && !businessRules.isWhitelisted) {
        console.log(`🚫 NOT responding to blacklisted email from ${fromEmail}`);
        
        // Mark as read but don't respond
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          });
        } catch (markError) {
          console.warn('⚠️ Failed to mark as read:', markError.message);
        }
        
        return NextResponse.json({
          success: false,
          filtered: true,
          reason: businessRules.reason || 'Email is blacklisted',
          message: `Email from ${replyToEmail} is blacklisted. No response sent.`,
          filterType: 'blacklist',
          isBlacklisted: true
        });
      }
      
      // If whitelisted, skip other filters
      if (businessRules.isWhitelisted) {
        console.log(`✅ Whitelisted email from ${fromEmail} - will respond regardless of other filters`);
      } else {
        // CHECK OTHER EMAIL FILTERS
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
      }
      
      console.log(`✅ Email from ${fromEmail} passed all filters - preparing response`);
    }

    // 🎯 UPDATED: DECIDE WHETHER TO USE CUSTOM RESPONSE OR GENERATE AI RESPONSE
    const startTime = Date.now();
    let aiText = '';
    let eventsTracked = 0;
    let trackedEvents = [];
    let isCustom = false;
    
    if (customResponse) {
      // 🎯 USE THE EDITED/CUSTOM RESPONSE
      console.log('📝 Using custom edited response provided by user');
      aiText = customResponse;
      isCustom = true;
    } else {
      // 🎯 GENERATE AI RESPONSE USING CENTRALIZED SERVICE
      console.log('🧠 Using centralized AI service from lib/ai-service.js...');
      
      try {
        // Call your centralized AI service
        const aiResult = await generateGmailResponse(
          connection.email,  // customerEmail
          customMessage || originalBody,  // emailContent
          subject,  // subject
          []  // conversationHistory (could load from DB if needed)
        );
        
        if (aiResult.success) {
          aiText = aiResult.response;
          eventsTracked = aiResult.eventsTracked || 0;
          trackedEvents = aiResult.trackedEvents || [];
          
          console.log('✅ AI response generated successfully using centralized service');
          console.log('📊 Events tracked:', eventsTracked);
          console.log('📍 Response preview:', aiText.substring(0, 150) + '...');
          console.log('📚 Knowledge base used:', aiResult.metadata?.knowledgeBaseUsed);
          console.log('🎯 Custom instructions used:', aiResult.metadata?.customPromptUsed);
        } else {
          throw new Error(aiResult.error || 'AI generation failed');
        }
        
      } catch (aiError) {
        console.error('❌ Centralized AI generation failed:', aiError.message);
        
        // Fallback response
        const businessName = customerSettings?.business_name || 'our team';
        aiText = `Thank you for reaching out to ${businessName}. We've received your message and will provide you with detailed information shortly.

Best regards,
${businessName}`;
      }
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Response ${isCustom ? 'prepared' : 'generated'} in ${responseTime}ms`);

    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    // SEND OR PREVIEW EMAIL
    if (actualSend) {
      console.log('📤 Sending response to:', replyToEmail);
      
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

      // 🎯 TRACK RESPONSE IN CONTACT
      if (customerSettings && customerSettings.customer_id && contactId) {
        try {
          console.log(`📊 Tracking ${isCustom ? 'custom' : 'AI'} response for contact ${contactId}`);
          
          await trackLeadEventWithContact(
            customerSettings.customer_id,
            contactId,
            {
              type: isCustom ? 'custom_response' : 'ai_response',
              channel: 'gmail',
              message: originalBody.substring(0, 500),
              ai_response: aiText.substring(0, 500),
              metadata: JSON.stringify({
                subject: replySubject,
                to: replyToEmail,
                gmail_message_id: sendResponse.data.id,
                thread_id: messageData.data.threadId,
                response_time: responseTime,
                is_custom: isCustom
              })
            }
          );
          
          // Update lead scoring after response
          await updateLeadScoring(customerSettings.customer_id, contactId);
          
          console.log(`✅ ${isCustom ? 'Custom' : 'AI'} response tracked in contact/lead system`);
        } catch (trackError) {
          console.error('❌ Failed to track response:', trackError);
        }
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
              sender_type: isCustom ? 'user' : 'ai',
              sender_email: connection.email,
              recipient_email: replyToEmail,
              subject: replySubject,
              body_text: aiText,
              is_ai_response: !isCustom,
              ai_model: isCustom ? 'custom' : 'gpt-4o-mini',
              sent_at: new Date()
            });
          }
        } catch (dbError) {
          console.error('⚠️ Database save failed:', dbError.message);
        }
      }

      console.log(`🎉 ${isCustom ? 'Custom' : 'AI'} response sent successfully with lead tracking!`);

      return NextResponse.json({
        success: true,
        message: `${isCustom ? 'Custom' : 'AI'} response sent successfully with lead tracking!`,
        response: aiText,
        sentTo: replyToEmail,
        threadId: messageData.data.threadId,
        responseTime: responseTime,
        filtered: false,
        actualSent: true,
        eventsTracked: eventsTracked,
        trackedEvents: trackedEvents,
        usingCentralizedAI: !isCustom,
        isCustomResponse: isCustom,
        knowledgeBaseUsed: !isCustom,
        customInstructionsUsed: !isCustom,
        leadTracked: !!contactId,
        contactId: contactId
      });

    } else {
      // PREVIEW MODE
      console.log('👁️ Preview mode - not sending email');
      
      return NextResponse.json({
        success: true,
        message: `${isCustom ? 'Custom' : 'AI'} response generated (preview mode) with lead tracking`,
        response: aiText,
        wouldReplyTo: replyToEmail,
        threadId: messageData.data.threadId,
        responseTime: responseTime,
        filtered: false,
        preview: true,
        actualSend: false,
        eventsTracked: eventsTracked,
        trackedEvents: trackedEvents,
        usingCentralizedAI: !isCustom,
        isCustomResponse: isCustom,
        knowledgeBaseUsed: !isCustom,
        customInstructionsUsed: !isCustom,
        leadWouldBeTracked: !!contactId,
        contactId: contactId
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
    message: 'Gmail Monitor API v3.2 with Custom Response Support',
    status: 'Active',
    version: '3.2-with-custom-responses',
    features: [
      '✏️ SUPPORTS CUSTOM/EDITED RESPONSES',
      '📝 Send edited messages instead of AI-generated ones',
      '🎯 CREATES/UPDATES CONTACTS IN LEADS DATABASE',
      '📊 Tracks all interactions in contacts table',
      '🔥 Updates lead scoring automatically',
      '📇 Creates leads when emails arrive',
      '💬 Updates leads when AI responds',
      '🎯 USES CENTRALIZED AI SERVICE from lib/ai-service.js',
      '📚 Knowledge base and custom instructions from centralized service',
      '🚫 Blacklist checking - blocks specified emails/domains',
      '✅ Whitelist checking - always responds to specified emails',
      '🔥 Priority keywords detection',
      '🔍 Email filtering (blocks noreply, spam, newsletters)',
      '🗂️ Auto-archives filtered and blacklisted emails',
      '💾 Database tracking',
      '⚡ Safe processing limits',
      '⏰ Timeout protection'
    ],
    customResponses: {
      howToUse: 'Include "customResponse" in the request body with your edited text',
      whenUsed: 'System will send your edited text instead of generating AI response',
      tracking: 'Custom responses are tracked differently from AI responses in the database'
    },
    leadTracking: {
      whenEmailsArrive: 'Creates/updates contact in contacts table',
      whenAIResponds: 'Updates contact and tracks AI response',
      whenCustomResponds: 'Updates contact and tracks custom response',
      leadScoring: 'Automatically calculates and updates lead scores',
      eventTracking: 'Tracks all interactions in ai_analytics_events'
    },
    businessRules: {
      blacklist: 'Emails/domains that should never get responses',
      whitelist: 'Emails/domains that always get responses (bypass filters)',
      priority: 'Keywords that mark emails as high priority/hot leads'
    },
    endpoints: {
      check: 'POST with action: "check" - checks emails and creates leads',
      respond: 'POST with action: "respond", emailId required - responds and updates leads',
      customRespond: 'POST with action: "respond", emailId, and customResponse - sends edited message'
    }
  });
}
