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

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR WITH CENTRALIZED AI SERVICE v2.0 ===');
  
  try {
    const body = await request.json();
    const { action, emailAddress, emailId, customMessage, actualSend = false } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    console.log('🚀 Actual Send Mode:', actualSend);
    console.log('💾 Database storage: ENABLED');
    console.log('🧠 Centralized AI Service: ENABLED');
    
    if (!emailAddress) {
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
      console.error('⚠️ Token refresh failed:', refreshError.message);
      return NextResponse.json({ 
        error: 'Gmail connection expired. Please reconnect.',
        suggestion: 'Visit /api/auth/google to reauthenticate'
      }, { status: 401 });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (action === 'check') {
      return await checkForNewEmails(gmail, connection, dbConnectionId);
    } else if (action === 'respond') {
      return await respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend);
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

async function checkForNewEmails(gmail, connection, dbConnectionId) {
  try {
    console.log('🔍 Checking for new emails with centralized AI analysis...');

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10
    });

    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} unread emails`);

    const emailDetails = [];

    for (const message of messages.slice(0, 5)) {
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

        // 🎯 NEW: Use centralized AI service for hot lead analysis
        let hotLeadData = { isHotLead: false, score: 0, reasoning: 'No analysis', knowledgeBaseUsed: false };
        
        try {
          console.log('🧠 Using centralized AI service for hot lead analysis...');
          
          const aiAnalysis = await generateGmailResponse(
            connection.email, // customerEmail - identifies the business
            body, // email content
            subjectHeader?.value || 'Email', // email subject
            [] // conversation history (empty for new emails)
          );
          
          if (aiAnalysis.success) {
            hotLeadData = {
              isHotLead: aiAnalysis.hotLead || false,
              score: aiAnalysis.hotLeadScore || 0,
              reasoning: aiAnalysis.hotLeadReasons?.join(', ') || 'Centralized AI analysis completed',
              knowledgeBaseUsed: aiAnalysis.knowledgeBaseUsed || false,
              tokensUsed: aiAnalysis.tokensUsed || 0,
              model: aiAnalysis.model || 'centralized-ai'
            };
            console.log('✅ Centralized AI analysis completed:', {
              hotLead: hotLeadData.isHotLead,
              score: hotLeadData.score,
              knowledgeBase: hotLeadData.knowledgeBaseUsed
            });
          } else {
            console.log('⚠️ Centralized AI analysis failed, using fallback');
          }
        } catch (aiError) {
          console.error('⚠️ Centralized AI analysis error:', aiError.message);
        }

        // Save to database if we have a connection ID
        if (dbConnectionId) {
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
          aiServiceUsed: true,
          centralizedAI: true
        });

      } catch (messageError) {
        console.error('❌ Error processing message:', messageError.message);
        continue;
      }
    }

    console.log(`💾 Processed ${emailDetails.length} emails with centralized AI service`);

    return NextResponse.json({
      success: true,
      message: `Found ${messages.length} unread emails`,
      emails: emailDetails,
      connectedEmail: connection.email,
      totalFound: messages.length,
      databaseEnabled: true,
      centralizedAI: true,
      serviceVersion: '2.0',
      dbConnectionId: dbConnectionId
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
async function respondToEmail(gmail, connection, dbConnectionId, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Generating AI response with Centralized AI Service v2.0...');

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

    // 🎯 NEW: Use centralized AI service to generate response
    console.log('🧠 Using centralized AI service to generate Gmail response...');
    
    const startTime = Date.now();
    let aiResult;
    let usedCentralizedAI = false;
    
    try {
      // Get conversation history (you could implement this to get previous emails in thread)
      const conversationHistory = []; // For now, empty - you can add thread history here
      
      aiResult = await generateGmailResponse(
        connection.email, // customerEmail - identifies the business
        customMessage || originalBody, // the message to respond to
        subjectHeader?.value || 'Your inquiry', // email subject
        conversationHistory // previous messages in thread
      );
      
      if (aiResult.success) {
        usedCentralizedAI = true;
        console.log('✅ Centralized AI service generated response successfully');
      } else {
        throw new Error(`Centralized AI service failed: ${aiResult.error}`);
      }
    } catch (centralizedError) {
      console.log('⚠️ Centralized AI service failed, using fallback:', centralizedError.message);
      
      // Fallback to your original system
      const aiSettings = await getCustomerAISettings(connection.email);
      const businessName = aiSettings?.business_name || connection.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
      const systemPrompt = buildAIPrompt(aiSettings, businessName);
      
      const aiResponse = await openai.chat.completions.create({
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
      });

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
    
    if (!aiResult.success) {
      throw new Error(`AI service failed: ${aiResult.error}`);
    }

    console.log('✅ AI response generated in', responseTime, 'ms');
    console.log('📝 Response preview:', aiResult.response.substring(0, 150) + '...');
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
      // Send email
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
        requestBody: { removeLabelIds: ['UNREAD'] }
      });

      // Save AI response to database
      if (dbConnectionId) {
        try {
          // Find conversation
          const convResult = await query(`
            SELECT * FROM gmail_conversations 
            WHERE gmail_connection_id = $1 AND thread_id = $2
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

            // Log AI response for analytics
            await query(`
              INSERT INTO ai_response_logs (
                gmail_connection_id, conversation_id, customer_message, ai_response,
                model_used, temperature, response_time_ms, tokens_used
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              dbConnectionId,
              conversation.id,
              originalBody,
              aiResult.response,
              aiResult.model || 'centralized-ai',
              0.7,
              responseTime,
              aiResult.tokensUsed || 0
            ]);

            console.log('✅ AI response and analytics saved to database');
          }
        } catch (dbError) {
          console.error('⚠️ Failed to save AI response to database:', dbError.message);
        }
      }

      console.log('🎉 Email sent successfully with Centralized AI Service v2.0!');

      return NextResponse.json({
        success: true,
        message: usedCentralizedAI 
          ? 'AI response sent successfully with centralized AI service!' 
          : 'AI response sent successfully with fallback system!',
        actualSent: true,
        centralizedAI: usedCentralizedAI,
        databaseEnabled: true,
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
    message: 'Gmail Monitor API with Centralized AI Service v2.0',
    status: 'Active',
    version: '2.0',
    features: [
      '🎯 Centralized AI Service Integration ✨',
      '📚 Knowledge Base + Custom Prompts Combined',
      '🔥 Advanced Hot Lead Detection',
      '💾 Database conversation tracking', 
      '📊 AI performance analytics',
      '🤖 Channel-specific AI formatting',
      '⚡ Unified AI configuration management',
      '🛡️ Graceful fallback to original system'
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
      '✅ Backward compatible with existing system'
    ]
  });
}
