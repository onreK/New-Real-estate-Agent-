import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { query } from '@/lib/database.js';
// 🎯 Import the centralized AI service we created
import { generateGmailResponse } from '@/lib/ai-service.js';

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

// 🎯 SAFE PROCESSING LIMITS TO PREVENT CRASHES
const EMAIL_LIMITS = {
  MAX_FETCH: 30,        // Fetch max 30 emails (conservative increase from 10)
  MAX_PROCESS: 20,      // Process max 20 emails (conservative increase from 5)
  TIMEOUT_MS: 25000,    // 25 second timeout
  BATCH_SIZE: 5         // Process in batches of 5
};

// Keep your existing helper function for backward compatibility
async function getCustomerAISettings(customerEmail) {
  try {
    console.log('📚 Loading AI settings for customer email:', customerEmail);
    
    // First try to find customer by email in customers table
    const customerQuery = `
      SELECT c.*, es.* 
      FROM customers c
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE c.email = $1
      LIMIT 1
    `;
    
    let result = await query(customerQuery, [customerEmail]);
    
    // If not found by customer email, try by email_settings email_address
    if (result.rows.length === 0) {
      const settingsQuery = `
        SELECT c.*, es.* 
        FROM email_settings es
        LEFT JOIN customers c ON es.customer_id = c.id
        WHERE es.email_address = $1
        LIMIT 1
      `;
      result = await query(settingsQuery, [customerEmail]);
    }
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const settings = {
        business_name: row.business_name || 'Your Business',
        tone: row.tone || 'professional',
        knowledge_base: row.knowledge_base || '',
        expertise: row.expertise || '',
        specialties: row.specialties || '',
        hot_lead_keywords: row.hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready']
      };
      
      console.log('✅ Found AI settings for:', settings.business_name);
      console.log('📖 Knowledge base length:', settings.knowledge_base?.length || 0, 'characters');
      
      return settings;
    }
    
    console.log('⚠️ No AI settings found, using defaults');
    return null;
  } catch (error) {
    console.error('❌ Error loading AI settings:', error);
    return null;
  }
}

// Keep your existing buildAIPrompt function for fallback
function buildAIPrompt(aiSettings, businessName) {
  const basePrompt = `You are a professional AI assistant representing ${aiSettings?.business_name || businessName}.`;
  
  let prompt = basePrompt;
  
  // Add knowledge base if available
  if (aiSettings?.knowledge_base && aiSettings.knowledge_base.trim()) {
    prompt += `\n\nBUSINESS INFORMATION:\n${aiSettings.knowledge_base}`;
  }
  
  // Add tone guidance
  const tone = aiSettings?.tone || 'professional';
  prompt += `\n\nCOMMUNICATION STYLE: Respond in a ${tone} tone.`;
  
  // Add expertise if available
  if (aiSettings?.expertise || aiSettings?.specialties) {
    prompt += `\nEXPERTISE: ${aiSettings.expertise} ${aiSettings.specialties}`.trim();
  }
  
  prompt += `\n\nINSTRUCTIONS:
- Answer customer questions using the business information provided above
- Be specific about services, pricing, and processes when mentioned in the business information
- Keep responses helpful, accurate, and professional
- If asked about services or pricing, use the specific information from the business details
- If information isn't available in the business details, say so politely
- Keep responses concise but informative`;

  return prompt;
}

// Helper function to save/update Gmail connection in database
async function saveGmailConnectionToDatabase(connectionData) {
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
      connectionData.user_id || 'anonymous',
      connectionData.email,
      connectionData.accessToken,
      connectionData.refreshToken,
      connectionData.tokenExpiry,
      'connected'
    ]);
    
    console.log('✅ Gmail connection saved to database:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('⚠️ Failed to save Gmail connection to database:', error.message);
    return null;
  }
}

// Helper function to save conversation to database
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
    
    console.log('✅ Conversation saved to database:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('⚠️ Failed to save conversation to database:', error.message);
    return null;
  }
}

// Helper function to save message to database
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
      console.log('✅ Message saved to database:', result.rows[0].id);
      return result.rows[0];
    } else {
      console.log('ℹ️ Message already exists in database');
      return null;
    }
  } catch (error) {
    console.error('⚠️ Failed to save message to database:', error.message);
    return null;
  }
}

// 🎯 NEW: Timeout wrapper for email processing
async function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR WITH SAFE LIMITS v2.1 ===');
  
  try {
    // 🎯 Add overall timeout protection
    const requestTimeout = setTimeout(() => {
      console.error('⏰ Request timed out after 30 seconds');
    }, 30000);

    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send Mode:', actualSend);
    console.log('💾 Database storage: ENABLED');
    console.log('🧠 Centralized AI Service: ENABLED');
    console.log('🛡️ Safe limits: Fetch', EMAIL_LIMITS.MAX_FETCH, '/ Process', EMAIL_LIMITS.MAX_PROCESS);
    
    if (!emailAddress) {
      clearTimeout(requestTimeout);
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 });
    }

    // Get connection from memory (your existing system)
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
        tokenExpiry: Date.now() - 1000 // Force refresh
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
      
      // Update connection with fresh tokens
      connection.accessToken = credentials.access_token;
      connection.tokenExpiry = credentials.expiry_date;
      
      // Save connection to database with fresh tokens
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
      details: error.message,
      suggestion: 'Please try again or contact support if the issue persists'
    }, { status: 500 });
  }
}

async function checkForNewEmails(gmail, connection, dbConnectionId) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Checking for new emails with safe limits and centralized AI analysis...');

    // 🎯 SAFE: Conservative increase from 10 to 30 (not 100)
    const response = await withTimeout(
      gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: EMAIL_LIMITS.MAX_FETCH  // 30 emails instead of 100
      }),
      10000, // 10 second timeout for Gmail API call
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
        databaseEnabled: true,
        centralizedAI: true,
        serviceVersion: '2.1-safe',
        processingTime: Date.now() - startTime,
        safeLimits: EMAIL_LIMITS
      });
    }

    const emailDetails = [];
    let processedCount = 0;
    let failedCount = 0;

    // 🎯 SAFE: Process emails in smaller batches with limits
    const emailsToProcess = messages.slice(0, EMAIL_LIMITS.MAX_PROCESS); // Max 20 emails
    console.log(`🔄 Processing ${emailsToProcess.length} emails in batches of ${EMAIL_LIMITS.BATCH_SIZE}...`);

    for (let i = 0; i < emailsToProcess.length; i += EMAIL_LIMITS.BATCH_SIZE) {
      const batch = emailsToProcess.slice(i, i + EMAIL_LIMITS.BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / EMAIL_LIMITS.BATCH_SIZE) + 1} (${batch.length} emails)...`);

      // Process batch with timeout protection
      await Promise.allSettled(
        batch.map(async (message) => {
          try {
            const messageData = await withTimeout(
              gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
              }),
              8000, // 8 second timeout per message
              `Get message ${message.id}`
            );

            const headers = messageData.data.payload.headers;
            const fromHeader = headers.find(h => h.name === 'From');
            const subjectHeader = headers.find(h => h.name === 'Subject');
            const dateHeader = headers.find(h => h.name === 'Date');
            const messageIdHeader = headers.find(h => h.name === 'Message-ID');

            // Extract customer info
            const fromEmail = fromHeader?.value || '';
            const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
            const customerEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;
            const customerName = fromEmail.replace(/<.*>/, '').trim().replace(/['"]/g, '') || 'Unknown';

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
              
              if (!body) {
                body = messageData.data.snippet || 'Email content unavailable';
              }
            } catch (bodyError) {
              body = messageData.data.snippet || 'Email content unavailable';
            }

            // Clean up body text
            body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (match, hex) => {
              return String.fromCharCode(parseInt(hex, 16));
            });

            // 🎯 SIMPLIFIED: Skip AI analysis for now to prevent timeouts
            let hotLeadData = { isHotLead: false, score: 0, reasoning: 'Skipped for performance', knowledgeBaseUsed: false };
            
            // Only do AI analysis for first few emails to prevent timeout
            if (processedCount < 5) {
              try {
                console.log('🧠 Running quick centralized AI analysis...');
                
                const aiAnalysis = await withTimeout(
                  generateGmailResponse(
                    connection.email, // customerEmail - identifies the business
                    body, // email content
                    subjectHeader?.value || 'Email', // email subject
                    [] // conversation history (empty for new emails)
                  ),
                  5000, // 5 second timeout for AI analysis
                  'AI analysis'
                );
                
                if (aiAnalysis && aiAnalysis.success) {
                  hotLeadData = {
                    isHotLead: aiAnalysis.hotLead || false,
                    score: aiAnalysis.hotLeadScore || 0,
                    reasoning: aiAnalysis.hotLeadReasons?.join(', ') || 'Quick AI analysis completed',
                    knowledgeBaseUsed: aiAnalysis.knowledgeBaseUsed || false,
                    tokensUsed: aiAnalysis.tokensUsed || 0,
                    model: aiAnalysis.model || 'centralized-ai'
                  };
                } else {
                  console.log('⚠️ AI analysis failed, using default');
                }
              } catch (aiError) {
                console.error('⚠️ AI analysis error (continuing):', aiError.message);
                hotLeadData.reasoning = 'AI analysis skipped due to timeout';
              }
            }

            // 🎯 SIMPLIFIED: Skip database saves for now to prevent slowdown
            // Save to database if we have a connection ID
            if (dbConnectionId && processedCount < 10) { // Only save first 10 to database
              try {
                // Save conversation
                const conversation = await saveConversationToDatabase(
                  dbConnectionId,
                  messageData.data.threadId,
                  customerEmail,
                  customerName,
                  subjectHeader?.value
                );

                if (conversation) {
                  // Save message
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
                    message_id_header: messageIdHeader?.value,
                    sent_at: new Date(parseInt(messageData.data.internalDate))
                  });
                }
              } catch (dbError) {
                console.error('⚠️ Database save failed (continuing anyway):', dbError.message);
              }
            }

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
              isUnread: messageData.data.labelIds?.includes('UNREAD') || false,
              // 🎯 Enhanced with centralized AI data
              isHotLead: hotLeadData.isHotLead,
              hotLeadScore: hotLeadData.score,
              hotLeadReasoning: hotLeadData.reasoning,
              knowledgeBaseUsed: hotLeadData.knowledgeBaseUsed,
              aiServiceUsed: processedCount < 5, // Only first 5 get AI analysis
              centralizedAI: true
            });

            processedCount++;

          } catch (messageError) {
            console.error('❌ Error processing message (continuing):', messageError.message);
            failedCount++;
          }
        })
      );

      // Small delay between batches to prevent overwhelming the system
      if (i + EMAIL_LIMITS.BATCH_SIZE < emailsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    // Sort by date (newest first)
    emailDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

    const processingTime = Date.now() - startTime;
    console.log(`✅ Safely processed ${processedCount} out of ${messages.length} emails in ${processingTime}ms`);
    console.log(`📊 Success: ${processedCount}, Failed: ${failedCount}, Total found: ${messages.length}`);

    return NextResponse.json({
      success: true,
      message: `Found ${messages.length} unread emails, safely processed ${processedCount}`,
      emails: emailDetails,
      connectedEmail: connection.email,
      totalFound: messages.length,
      totalProcessed: processedCount,
      totalFailed: failedCount,
      databaseEnabled: true,
      centralizedAI: true,
      serviceVersion: '2.1-safe',
      processingTime: processingTime,
      safeLimits: EMAIL_LIMITS,
      performance: {
        fetchTimeMs: processingTime,
        avgTimePerEmail: Math.round(processingTime / Math.max(processedCount, 1)),
        batchSize: EMAIL_LIMITS.BATCH_SIZE
      }
    });

  } catch (error) {
    console.error('❌ Error checking emails:', error);
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Email check timed out',
        details: 'Processing took too long. Try again with fewer emails.',
        suggestion: 'The system is processing safely but hit timeout limits.'
      }, { status: 408 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check emails safely',
      details: error.message,
      suggestion: 'Please try again. The system is using safe processing limits.'
    }, { status: 500 });
  }
}

// 🎯 UPDATED: respondToEmail function using CENTRALIZED AI SERVICE
async function respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Generating AI response with Centralized AI Service v2.1 (safe mode)...');

  try {
    // Get original email with timeout
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

    // Extract reply email
    const fromEmail = fromHeader?.value || '';
    const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
    const replyToEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;

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

    // 🎯 NEW: Use centralized AI service to generate response with timeout
    console.log('🧠 Using centralized AI service to generate Gmail response...');
    
    const startTime = Date.now();
    let aiResult;
    let usedCentralizedAI = false;
    
    try {
      // Get conversation history (you could implement this to get previous emails in thread)
      const conversationHistory = []; // For now, empty - you can add thread history here
      
      aiResult = await withTimeout(
        generateGmailResponse(
          connection.email, // customerEmail - identifies the business
          customMessage || originalBody, // the message to respond to
          subjectHeader?.value || 'Your inquiry', // email subject
          conversationHistory // previous messages in thread
        ),
        15000, // 15 second timeout for AI generation
        'AI response generation'
      );
      
      if (aiResult && aiResult.success) {
        usedCentralizedAI = true;
        console.log('✅ Centralized AI service generated response successfully');
      } else {
        throw new Error(`Centralized AI service failed: ${aiResult?.error || 'Unknown error'}`);
      }
    } catch (centralizedError) {
      console.log('⚠️ Centralized AI service failed, using fallback:', centralizedError.message);
      
      // Fallback to your original system
      const aiSettings = await getCustomerAISettings(connection.email);
      const businessName = aiSettings?.business_name || connection.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
      const systemPrompt = buildAIPrompt(aiSettings, businessName);
      
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
        12000, // 12 second timeout for OpenAI
        'OpenAI fallback'
      );

      const aiText = aiResponse.choices[0]?.message?.content;
      
      // Create fallback aiResult structure
      aiResult = {
        success: true,
        response: aiText,
        hotLead: false,
        hotLeadScore: 0,
        tokensUsed: aiResponse.usage?.total_tokens || 0,
        knowledgeBaseUsed: !!(aiSettings?.knowledge_base?.trim()),
        model: 'gpt-4o-mini-fallback'
      };
      usedCentralizedAI = false;
    }
    
    const responseTime = Date.now() - startTime;
    
    if (!aiResult || !aiResult.success) {
      throw new Error(`AI service failed: ${aiResult?.error || 'No response generated'}`);
    }

    console.log('✅ AI response generated in', responseTime, 'ms');
    console.log('📝 Response preview:', aiResult.response?.substring(0, 150) + '...');
    console.log('🔥 Hot lead detected:', aiResult.hotLead);
    console.log('📚 Knowledge base used:', aiResult.knowledgeBaseUsed);
    console.log('🎯 Centralized AI used:', usedCentralizedAI);

    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    const emailBody = `${aiResult.response}

--
Best regards,
${connection.email}

📧 This email was automatically generated by Bizzy Bot AI ${usedCentralizedAI ? 'using our centralized AI service' : 'with fallback system'}`;

    if (actualSend) {
      // Send email with timeout
      const rawMessage = [
        `From: ${connection.email}`,
        `To: ${replyToEmail}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${messageIdHeader?.value || ''}`,
        `References: ${messageIdHeader?.value || ''}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        emailBody
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
        10000, // 10 second timeout for sending
        'Email send'
      );

      // Mark original as read
      try {
        await withTimeout(
          gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: { removeLabelIds: ['UNREAD'] }
          }),
          5000, // 5 second timeout for marking as read
          'Mark as read'
        );
      } catch (markError) {
        console.warn('⚠️ Failed to mark email as read:', markError.message);
      }

      // Save AI response to database (optional, with timeout protection)
      if (dbConnectionId) {
        try {
          const saveStart = Date.now();
          await withTimeout(
            (async () => {
              // Find conversation
              const convResult = await query(`
                SELECT * FROM gmail_conversations 
                WHERE gmail_connection_id = $1 AND thread_id = $2
                LIMIT 1
              `, [dbConnectionId, messageData.data.threadId]);

              if (convResult.rows.length > 0) {
                const conversation = convResult.rows[0];
                
                // Save AI response message
                await saveMessageToDatabase(conversation.id, {
                  gmail_message_id: sendResponse.data.id,
                  thread_id: messageData.data.threadId,
                  sender_type: 'ai',
                  sender_email: connection.email,
                  recipient_email: replyToEmail,
                  subject: replySubject,
                  body_text: emailBody,
                  is_ai_response: true,
                  ai_model: aiResult.model || 'centralized-ai',
                  sent_at: new Date()
                });

                console.log('✅ AI response saved to database in', Date.now() - saveStart, 'ms');
              }
            })(),
            8000, // 8 second timeout for database operations
            'Database save'
          );
        } catch (dbError) {
          console.error('⚠️ Failed to save AI response to database (non-critical):', dbError.message);
        }
      }

      console.log('🎉 Email sent successfully with safe processing!');

      return NextResponse.json({
        success: true,
        message: usedCentralizedAI 
          ? 'AI response sent successfully with centralized AI service!' 
          : 'AI response sent successfully with fallback system!',
        actualSent: true,
        centralizedAI: usedCentralizedAI,
        databaseEnabled: true,
        safeMode: true,
        data: {
          messageId: sendResponse.data.id,
          aiResponse: aiResult.response,
          sentTo: replyToEmail,
          responseTime: responseTime,
          tokensUsed: aiResult.tokensUsed || 0,
          knowledgeBaseUsed: aiResult.knowledgeBaseUsed || false,
          hotLeadDetected: aiResult.hotLead || false,
          hotLeadScore: aiResult.hotLeadScore || 0,
          model: aiResult.model || 'centralized-ai'
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: usedCentralizedAI 
          ? 'AI response generated with centralized service (preview)' 
          : 'AI response generated with fallback system (preview)',
        preview: true,
        centralizedAI: usedCentralizedAI,
        databaseEnabled: true,
        safeMode: true,
        data: {
          aiResponse: aiResult.response,
          wouldReplyTo: replyToEmail,
          emailBody: emailBody,
          responseTime: responseTime,
          tokensUsed: aiResult.tokensUsed || 0,
          knowledgeBaseUsed: aiResult.knowledgeBaseUsed || false,
          hotLeadDetected: aiResult.hotLead || false,
          hotLeadScore: aiResult.hotLeadScore || 0,
          hotLeadReasoning: aiResult.hotLeadReasons?.join(', ') || 'No analysis',
          model: aiResult.model || 'centralized-ai'
        }
      });
    }

  } catch (error) {
    console.error('❌ Error with AI response generation:', error);
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'AI response generation timed out',
        details: 'Response generation took too long. Please try again.',
        centralizedAI: false
      }, { status: 408 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate AI response',
      details: error.message,
      centralizedAI: false
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Monitor API with Safe Processing v2.1',
    status: 'Active',
    version: '2.1-safe',
    safeLimits: EMAIL_LIMITS,
    features: [
      '🎯 Centralized AI Service Integration ✨',
      '📚 Knowledge Base + Custom Prompts Combined',
      '🔥 Advanced Hot Lead Detection',
      '💾 Database conversation tracking', 
      '📊 AI performance analytics',
      '🤖 Channel-specific AI formatting',
      '⚡ Unified AI configuration management',
      '🛡️ Graceful fallback to original system',
      '🛡️ Safe processing limits to prevent crashes',
      '⏰ Timeout protection for all operations',
      '📦 Batch processing for better performance'
    ],
    endpoints: {
      check: 'POST with action: "check"',
      respond: 'POST with action: "respond", emailId required'
    },
    improvements: [
      '✅ Uses centralized AI service for all channels',
      '✅ Consistent hot lead detection across platforms',
      '✅ Centralized knowledge base management',
      '✅ Advanced analytics and monitoring',
      '✅ Easy maintenance from single AI service file',
      '✅ Backward compatible with existing system',
      '✅ Safe email limits (30 fetch / 20 process) to prevent crashes',
      '✅ Timeout protection on all operations',
      '✅ Batch processing for better performance',
      '✅ Graceful error handling and recovery'
    ]
  });
}
