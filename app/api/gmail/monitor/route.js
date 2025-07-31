// app/api/gmail/monitor/route.js - UPDATED TO USE CENTRALIZED AI SERVICE
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '../../../../lib/database.js';
// 🎯 IMPORT THE CENTRALIZED AI SERVICE - FIXED IMPORT PATH
import { generateGmailResponse } from '../../../../lib/ai-service.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Get Gmail connection for user
async function getGmailConnection(userId) {
  try {
    const result = await query(
      'SELECT * FROM gmail_connections WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting Gmail connection:', error);
    return null;
  }
}

// Save conversation to database
async function saveConversationToDatabase(dbConnectionId, emailData) {
  try {
    const result = await query(`
      INSERT INTO gmail_conversations (
        gmail_connection_id, thread_id, customer_email, customer_name,
        subject, status, is_hot_lead, hot_lead_score, ai_response_sent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (gmail_connection_id, thread_id) 
      DO UPDATE SET 
        hot_lead_score = EXCLUDED.hot_lead_score,
        is_hot_lead = EXCLUDED.is_hot_lead,
        ai_response_sent = EXCLUDED.ai_response_sent,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      dbConnectionId,
      emailData.thread_id,
      emailData.customer_email,
      emailData.customer_name,
      emailData.subject,
      'active',
      emailData.is_hot_lead || false,
      emailData.hot_lead_score || 0,
      emailData.ai_response_sent || false
    ]);
    
    console.log('✅ Conversation saved to database:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('⚠️ Failed to save conversation to database:', error.message);
    return null;
  }
}

// Save message to database
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

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR WITH CENTRALIZED AI SERVICE ===');
  
  try {
    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send Mode:', actualSend);
    
    if (!emailAddress) {
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 });
    }

    // Get connection for this email address
    const connection = await getGmailConnection(emailAddress);
    
    if (!connection) {
      return NextResponse.json({
        error: 'Gmail connection not found for this email address',
        suggestion: 'Please connect your Gmail account first'
      }, { status: 404 });
    }

    console.log('✅ Gmail connection found for:', connection.gmail_email);

    // Set up Gmail API with stored tokens
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (action === 'check') {
      return await checkEmails(gmail, connection);
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
      details: error.message
    }, { status: 500 });
  }
}

async function checkEmails(gmail, connection) {
  try {
    console.log('📧 Checking emails for:', connection.gmail_email);

    // Get unread emails
    const messages = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10
    });

    if (!messages.data.messages) {
      console.log('📧 No unread emails found');
      return NextResponse.json({
        success: true,
        message: 'No unread emails found',
        emails: [],
        connectedEmail: connection.gmail_email
      });
    }

    console.log(`📧 Found ${messages.data.messages.length} unread emails`);

    const emailDetails = [];
    
    // Process each email and save to database
    for (const message of messages.data.messages) {
      try {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const headers = messageData.data.payload.headers;
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const messageIdHeader = headers.find(h => h.name === 'Message-ID');

        const fromEmail = fromHeader?.value || '';
        const subject = subjectHeader?.value || 'No Subject';
        
        // Extract email body
        let bodyText = '';
        try {
          if (messageData.data.payload.body?.data) {
            bodyText = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
          } else if (messageData.data.payload.parts) {
            const textPart = messageData.data.payload.parts.find(part => 
              part.mimeType === 'text/plain'
            );
            if (textPart?.body?.data) {
              bodyText = Buffer.from(textPart.body.data, 'base64').toString();
            }
          }
          
          if (!bodyText) {
            bodyText = messageData.data.snippet || 'Email content unavailable';
          }
        } catch (bodyError) {
          bodyText = messageData.data.snippet || 'Email content unavailable';
        }

        // 🎯 USE CENTRALIZED AI SERVICE FOR HOT LEAD DETECTION
        console.log('🧠 Using centralized AI service for analysis...');
        const aiAnalysis = await generateGmailResponse(
          connection.gmail_email, // customerEmail
          bodyText, // email content
          subject, // email subject
          [] // conversation history (empty for new emails)
        );

        const emailDetail = {
          id: message.id,
          from: fromEmail,
          subject: subject,
          snippet: messageData.data.snippet,
          body: bodyText.substring(0, 500),
          threadId: messageData.data.threadId,
          // Hot lead data from centralized AI service
          isHotLead: aiAnalysis.hotLead?.isHotLead || false,
          hotLeadScore: aiAnalysis.hotLead?.score || 0,
          hotLeadReasoning: aiAnalysis.hotLead?.reasoning || 'No analysis',
          // AI service metadata
          aiServiceUsed: aiAnalysis.success,
          knowledgeBaseUsed: aiAnalysis.metadata?.knowledgeBaseUsed || false,
          customPromptUsed: aiAnalysis.metadata?.customPromptUsed || false
        };

        emailDetails.push(emailDetail);

        // Save conversation to database
        const conversationData = {
          thread_id: messageData.data.threadId,
          customer_email: fromEmail.match(/<(.+?)>/) ? fromEmail.match(/<(.+?)>/)[1] : fromEmail,
          customer_name: fromEmail.split('<')[0].trim() || 'Unknown',
          subject: subject,
          is_hot_lead: emailDetail.isHotLead,
          hot_lead_score: emailDetail.hotLeadScore,
          ai_response_sent: false
        };

        const savedConversation = await saveConversationToDatabase(connection.id, conversationData);

        // Save message to database
        if (savedConversation) {
          const messageToSave = {
            gmail_message_id: message.id,
            thread_id: messageData.data.threadId,
            sender_type: 'customer',
            sender_email: conversationData.customer_email,
            recipient_email: connection.gmail_email,
            subject: subject,
            body_text: bodyText,
            body_html: null,
            snippet: messageData.data.snippet,
            message_id_header: messageIdHeader?.value,
            in_reply_to: null,
            is_ai_response: false,
            ai_model: null,
            sent_at: new Date(parseInt(messageData.data.internalDate))
          };

          await saveMessageToDatabase(savedConversation.id, messageToSave);
        }

      } catch (messageError) {
        console.error('❌ Error processing message:', messageError.message);
        continue;
      }
    }

    console.log(`💾 Processed ${emailDetails.length} emails with centralized AI service`);

    return NextResponse.json({
      success: true,
      message: `Found ${messages.data.messages.length} unread emails`,
      emails: emailDetails,
      connectedEmail: connection.gmail_email,
      totalFound: messages.data.messages.length,
      centralizedAI: true,
      serviceVersion: '2.0'
    });

  } catch (error) {
    console.error('❌ Error checking emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check emails',
      details: error.message
    }, { status: 500 });
  }
}

// 🎯 UPDATED: respondToEmail function using CENTRALIZED AI SERVICE
async function respondToEmail(gmail, connection, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Generating AI response with CENTRALIZED AI SERVICE...');

  try {
    // Get original email
    const messageData = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full'
    });

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

    // 🎯 USE CENTRALIZED AI SERVICE TO GENERATE RESPONSE
    console.log('🧠 Using centralized AI service to generate Gmail response...');
    
    const startTime = Date.now();
    
    // Get conversation history (you could implement this to get previous emails in thread)
    const conversationHistory = []; // For now, empty - you can add thread history here
    
    const aiResult = await generateGmailResponse(
      connection.gmail_email, // customerEmail - identifies the business
      customMessage || originalBody, // the message to respond to
      subjectHeader?.value || 'Your inquiry', // email subject
      conversationHistory // previous messages in thread
    );
    
    const responseTime = Date.now() - startTime;
    
    if (!aiResult.success) {
      throw new Error(`AI service failed: ${aiResult.error}`);
    }

    console.log('✅ AI response generated with centralized service in', responseTime, 'ms');
    console.log('📝 Response preview:', aiResult.response.substring(0, 150) + '...');
    console.log('🔥 Hot lead detected:', aiResult.hotLead.isHotLead);
    console.log('📚 Knowledge base used:', aiResult.metadata.knowledgeBaseUsed);

    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    // Build complete email body
    const emailBody = `${aiResult.response}

📧 This email was automatically generated by Bizzy Bot AI using your business knowledge base.`;

    if (actualSend) {
      // Send email
      const rawMessage = [
        `From: ${connection.gmail_email}`,
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

      const sendResponse = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: messageData.data.threadId
        }
      });

      // Mark original as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      console.log('✅ Email sent and marked as read:', sendResponse.data.id);

      return NextResponse.json({
        success: true,
        message: 'AI response sent successfully with centralized AI service!',
        actualSent: true,
        centralizedAI: true,
        data: {
          messageId: sendResponse.data.id,
          aiResponse: aiResult.response,
          sentTo: replyToEmail,
          responseTime: responseTime,
          tokensUsed: aiResult.metadata.tokensUsed,
          knowledgeBaseUsed: aiResult.metadata.knowledgeBaseUsed,
          customPromptUsed: aiResult.metadata.customPromptUsed,
          hotLeadDetected: aiResult.hotLead.isHotLead,
          hotLeadScore: aiResult.hotLead.score,
          model: aiResult.metadata.model
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'AI response generated with centralized service (preview)',
        preview: true,
        centralizedAI: true,
        data: {
          aiResponse: aiResult.response,
          wouldReplyTo: replyToEmail,
          responseTime: responseTime,
          tokensUsed: aiResult.metadata.tokensUsed,
          knowledgeBaseUsed: aiResult.metadata.knowledgeBaseUsed,
          customPromptUsed: aiResult.metadata.customPromptUsed,
          hotLeadDetected: aiResult.hotLead.isHotLead,
          hotLeadScore: aiResult.hotLead.score,
          hotLeadReasoning: aiResult.hotLead.reasoning,
          model: aiResult.metadata.model
        }
      });
    }

  } catch (error) {
    console.error('❌ Error with centralized AI response:', error);
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
    message: 'Gmail Monitor API with Centralized AI Service',
    status: 'Active',
    version: '2.0',
    features: [
      '🎯 Centralized AI Service Integration ✨',
      '📚 Knowledge Base + Custom Prompts Combined',
      '🔥 Advanced Hot Lead Detection',
      '💾 Database conversation tracking', 
      '📊 AI performance analytics',
      '🤖 Channel-specific AI formatting',
      '⚡ Unified AI configuration management'
    ],
    endpoints: {
      check: 'POST with action: "check"',
      respond: 'POST with action: "respond", emailId required'
    },
    improvements: [
      '✅ 200+ lines of AI logic replaced with single function call',
      '✅ Consistent AI behavior across all channels',
      '✅ Centralized knowledge base management',
      '✅ Advanced analytics and monitoring',
      '✅ Easy maintenance and updates'
    ]
  });
}
