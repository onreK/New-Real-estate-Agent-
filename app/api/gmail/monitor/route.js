import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { query } from '@/lib/database.js';

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

// Helper function to get Gmail connection (tries database first, then memory)
async function getGmailConnection(emailAddress, userId = null) {
  console.log('🔍 Looking for Gmail connection:', { emailAddress, userId });

  // Try database first
  try {
    let dbQuery, params;
    if (userId) {
      dbQuery = 'SELECT * FROM gmail_connections WHERE user_id = $1 AND status = $2 ORDER BY updated_at DESC LIMIT 1';
      params = [userId, 'connected'];
    } else if (emailAddress) {
      dbQuery = 'SELECT * FROM gmail_connections WHERE gmail_email = $1 AND status = $2 ORDER BY updated_at DESC LIMIT 1';
      params = [emailAddress, 'connected'];
    } else {
      throw new Error('Either userId or emailAddress must be provided');
    }

    const dbResult = await query(dbQuery, params);
    
    if (dbResult.rows.length > 0) {
      const dbConnection = dbResult.rows[0];
      console.log('✅ Found Gmail connection in database:', dbConnection.gmail_email);
      
      return {
        id: dbConnection.id,
        userId: dbConnection.user_id,
        email: dbConnection.gmail_email,
        accessToken: dbConnection.access_token,
        refreshToken: dbConnection.refresh_token,
        tokenExpiry: dbConnection.token_expiry,
        userName: dbConnection.user_name,
        status: dbConnection.status,
        source: 'database'
      };
    }
  } catch (dbError) {
    console.log('⚠️ Database lookup failed, trying memory:', dbError.message);
  }

  // Fallback to memory storage
  if (!global.gmailConnections) {
    console.log('❌ No Gmail connections in memory');
    return null;
  }

  // Try to find by userId first, then by email
  let connection = null;
  if (userId) {
    connection = global.gmailConnections.get(userId);
  }
  
  if (!connection && emailAddress) {
    connection = Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
  }

  if (connection) {
    console.log('✅ Found Gmail connection in memory:', connection.email);
    return {
      userId: connection.userId,
      email: connection.email,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiry: connection.tokenExpiry,
      userName: connection.userName,
      status: connection.status,
      source: 'memory'
    };
  }

  console.log('❌ No Gmail connection found');
  return null;
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
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving conversation to database:', error);
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
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving message to database:', error);
    return null;
  }
}

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR STARTED ===');
  
  try {
    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false, userId } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('👤 User ID:', userId);
    console.log('🚀 Actual Send Mode:', actualSend);
    
    if (!emailAddress && !userId) {
      return NextResponse.json({ 
        error: 'Email address or user ID is required' 
      }, { status: 400 });
    }

    // Get Gmail connection using hybrid approach
    const connection = await getGmailConnection(emailAddress, userId);
    
    if (!connection) {
      return NextResponse.json({ 
        error: `Gmail connection not found. Please reconnect Gmail.`,
        redirect: '/api/auth/google'
      }, { status: 404 });
    }

    console.log('✅ Gmail connection found:', connection.email, 'from', connection.source);

    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry
    });

    // Handle token refresh if needed
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token !== connection.accessToken) {
        console.log('🔄 Refreshing Gmail tokens...');
        
        // Update tokens in database if connection came from database
        if (connection.source === 'database' && connection.id) {
          try {
            await query(`
              UPDATE gmail_connections 
              SET access_token = $1, token_expiry = $2, updated_at = CURRENT_TIMESTAMP
              WHERE id = $3
            `, [credentials.access_token, credentials.expiry_date, connection.id]);
            console.log('✅ Tokens updated in database');
          } catch (updateError) {
            console.error('⚠️ Failed to update tokens in database:', updateError.message);
          }
        }
        
        // Update tokens in memory if available
        if (global.gmailConnections && connection.userId) {
          const memoryConnection = global.gmailConnections.get(connection.userId);
          if (memoryConnection) {
            memoryConnection.accessToken = credentials.access_token;
            memoryConnection.tokenExpiry = credentials.expiry_date;
            console.log('✅ Tokens updated in memory');
          }
        }
        
        oauth2Client.setCredentials(credentials);
      }
    } catch (refreshError) {
      console.error('❌ Token refresh failed:', refreshError);
      return NextResponse.json({ 
        error: 'Gmail connection expired. Please reconnect your account.',
        redirect: '/api/auth/google'
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (action === 'check') {
      return await checkForNewEmails(gmail, connection);
    } else if (action === 'respond') {
      return await respondToEmail(gmail, connection, emailId, customMessage, actualSend);
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "check" or "respond"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Gmail monitor error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Gmail monitor failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

async function checkForNewEmails(gmail, connection) {
  try {
    console.log('🔍 Checking for new emails...');

    // Get unread messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10
    });

    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} unread emails`);

    const emailDetails = [];

    for (const message of messages.slice(0, 5)) { // Limit to 5 for demo
      try {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const headers = messageData.data.payload.headers;
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const dateHeader = headers.find(h => h.name === 'Date');
        const messageIdHeader = headers.find(h => h.name === 'Message-ID');
        const toHeader = headers.find(h => h.name === 'To');

        // Extract customer email and name
        const fromEmail = fromHeader?.value || '';
        const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
        const customerEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;
        const customerName = fromEmail.replace(/<.*>/, '').trim().replace(/['"]/g, '');

        // Get email body safely
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

        // Clean up the body text
        body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });

        // Save to database if connection has database backing
        if (connection.source === 'database' && connection.id) {
          try {
            // Create or update conversation
            const conversation = await saveConversationToDatabase(
              connection.id,
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
              console.log('✅ Message saved to database');
            }
          } catch (dbError) {
            console.error('⚠️ Failed to save to database:', dbError.message);
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
          preview: `From: ${fromHeader?.value}\nSubject: ${subjectHeader?.value}\nContent: ${body.substring(0, 100)}...`,
          receivedTime: new Date(parseInt(messageData.data.internalDate)).toLocaleString(),
          isUnread: messageData.data.labelIds?.includes('UNREAD') || false
        });

      } catch (messageError) {
        console.error('❌ Error processing message:', messageError.message);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${messages.length} unread emails`,
      emails: emailDetails,
      connectedEmail: connection.email,
      totalFound: messages.length,
      storage: connection.source
    });

  } catch (error) {
    console.error('❌ Error checking emails:', error);
    throw error;
  }
}

async function respondToEmail(gmail, connection, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Generating AI response for email:', emailId);
  console.log('📤 Will actually send email:', actualSend);

  try {
    // Get the original email
    const messageData = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full'
    });

    const headers = messageData.data.payload.headers;
    const fromHeader = headers.find(h => h.name === 'From');
    const subjectHeader = headers.find(h => h.name === 'Subject');
    const messageIdHeader = headers.find(h => h.name === 'Message-ID');

    console.log('📧 Original email from:', fromHeader?.value);
    console.log('📧 Original subject:', subjectHeader?.value);

    // Extract email address from From header
    const fromEmail = fromHeader?.value || '';
    const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
    const replyToEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;

    console.log('📧 Will reply to:', replyToEmail);

    // Get email body safely
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

    // Clean up the body text
    originalBody = originalBody.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    console.log('📝 Original body preview:', originalBody.substring(0, 150));

    // Generate AI response
    const businessName = connection.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    
    const systemPrompt = `You are a professional AI assistant representing ${businessName}. You are responding to a customer email inquiry.

Key guidelines:
- Be friendly, professional, and helpful
- Provide useful information about the business
- Keep responses concise but informative (2-3 paragraphs max)
- If you cannot answer something specific, offer to connect them with a human team member
- Always maintain a positive, solution-oriented tone
- End with a professional signature
- Do not include any email headers or technical information in your response

Business: ${businessName}
Email: ${connection.email}`;

    console.log('🤖 Calling OpenAI...');

    const startTime = Date.now();
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: customMessage || originalBody }
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    const aiText = aiResponse.choices[0]?.message?.content;
    const responseTime = Date.now() - startTime;

    if (!aiText) {
      throw new Error('No AI response generated');
    }

    console.log('✅ AI response generated in', responseTime, 'ms');

    // Create the email response
    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    const emailBody = `${aiText}

--
Best regards,
AI Assistant
${businessName}
${connection.email}

📧 This email was automatically generated by Bizzy Bot AI
🤖 For immediate assistance, please reply to this email`;

    if (actualSend) {
      console.log('📤 Actually sending email response...');

      // Create the raw email message
      const rawMessage = [
        `From: ${connection.email}`,
        `To: ${replyToEmail}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${messageIdHeader?.value || ''}`,
        `References: ${messageIdHeader?.value || ''}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        emailBody
      ].join('\r\n');

      // Encode the message
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send the email
      const sendResponse = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: messageData.data.threadId
        }
      });

      console.log('✅ Email sent successfully! Message ID:', sendResponse.data.id);

      // Save AI response to database if connection has database backing
      if (connection.source === 'database' && connection.id) {
        try {
          // Find or create conversation
          const conversationResult = await query(`
            SELECT * FROM gmail_conversations 
            WHERE gmail_connection_id = $1 AND thread_id = $2
          `, [connection.id, messageData.data.threadId]);

          if (conversationResult.rows.length > 0) {
            const conversation = conversationResult.rows[0];
            
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
              ai_model: 'gpt-4o-mini',
              sent_at: new Date()
            });

            // Log AI response for analytics
            await query(`
              INSERT INTO ai_response_logs (
                gmail_connection_id, conversation_id, customer_message, ai_response,
                model_used, temperature, response_time_ms, tokens_used
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              connection.id,
              conversation.id,
              originalBody,
              aiText,
              'gpt-4o-mini',
              0.7,
              responseTime,
              aiResponse.usage?.total_tokens || 0
            ]);

            console.log('✅ AI response saved to database');
          }
        } catch (dbError) {
          console.error('⚠️ Failed to save AI response to database:', dbError.message);
        }
      }

      // Mark original email as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      console.log('✅ Original email marked as read');

      return NextResponse.json({
        success: true,
        message: 'AI response sent successfully!',
        actualSent: true,
        data: {
          originalFrom: fromHeader?.value,
          originalSubject: subjectHeader?.value,
          sentTo: replyToEmail,
          replySubject: replySubject,
          aiResponse: aiText,
          messageId: sendResponse.data.id,
          responseTime: responseTime,
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          storage: connection.source,
          timestamp: new Date().toISOString()
        }
      });

    } else {
      // Preview mode
      return NextResponse.json({
        success: true,
        message: 'AI response generated (preview mode)',
        preview: true,
        data: {
          originalFrom: fromHeader?.value,
          originalSubject: subjectHeader?.value,
          wouldReplyTo: replyToEmail,
          replySubject: replySubject,
          aiResponse: aiText,
          fullEmailBody: emailBody,
          responseTime: responseTime,
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          storage: connection.source,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (responseError) {
    console.error('❌ Error generating/sending response:', responseError.message);
    
    return NextResponse.json({
      error: 'Failed to generate or send AI response',
      details: responseError.message
    }, { status: 500 });
  }
}
