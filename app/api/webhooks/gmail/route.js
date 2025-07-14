import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDbClient } from '../../../lib/database.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log('📧 Gmail webhook received');

    // Parse the Pub/Sub message
    const body = await request.json();
    
    if (!body.message) {
      console.log('⚠️ No message in webhook body');
      return NextResponse.json({ success: true });
    }

    // Decode the Pub/Sub message
    const messageData = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString()
    );

    console.log('📧 Gmail notification:', messageData);

    const { emailAddress, historyId } = messageData;

    if (!emailAddress || !historyId) {
      console.log('⚠️ Missing emailAddress or historyId');
      return NextResponse.json({ success: true });
    }

    // Find the Gmail connection for this email address
    const client = await getDbClient();
    let gmailConnection;
    
    try {
      const result = await client.query(
        'SELECT * FROM gmail_connections WHERE gmail_email = $1 AND status = $2',
        [emailAddress, 'connected']
      );
      
      gmailConnection = result.rows[0];
      
      if (!gmailConnection) {
        console.log('⚠️ No Gmail connection found for:', emailAddress);
        return NextResponse.json({ success: true });
      }

    } finally {
      client.release();
    }

    // Process the Gmail notification
    await processGmailNotification(gmailConnection, historyId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Gmail webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
}

async function processGmailNotification(gmailConnection, historyId) {
  try {
    console.log('🔄 Processing Gmail notification for:', gmailConnection.gmail_email);

    // Set up Gmail API client with stored tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: gmailConnection.access_token,
      refresh_token: gmailConnection.refresh_token,
      expiry_date: gmailConnection.token_expiry?.getTime()
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get the history of changes since last check
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: gmailConnection.history_id || historyId,
      labelId: 'INBOX'
    });

    if (!historyResponse.data.history) {
      console.log('📧 No new history items');
      return;
    }

    // Process each history item
    for (const historyItem of historyResponse.data.history) {
      if (historyItem.messagesAdded) {
        for (const messageAdded of historyItem.messagesAdded) {
          await processNewGmailMessage(gmail, gmailConnection, messageAdded.message);
        }
      }
    }

    // Update the history ID
    const client = await getDbClient();
    try {
      await client.query(
        'UPDATE gmail_connections SET history_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [historyId, gmailConnection.id]
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error processing Gmail notification:', error);
    throw error;
  }
}

async function processNewGmailMessage(gmail, gmailConnection, message) {
  try {
    console.log('📩 Processing new Gmail message:', message.id);

    // Get the full message details
    const messageDetails = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full'
    });

    const fullMessage = messageDetails.data;
    const headers = fullMessage.payload.headers;

    // Extract email details
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
    const toHeader = headers.find(h => h.name.toLowerCase() === 'to');

    if (!fromHeader || !toHeader) {
      console.log('⚠️ Missing from or to headers');
      return;
    }

    const senderEmail = extractEmailFromHeader(fromHeader.value);
    const senderName = extractNameFromHeader(fromHeader.value);
    const subject = subjectHeader?.value || '(No subject)';
    const recipientEmail = extractEmailFromHeader(toHeader.value);

    // Check if this is to the connected Gmail account
    if (recipientEmail.toLowerCase() !== gmailConnection.gmail_email.toLowerCase()) {
      console.log('📧 Message not for connected account, skipping');
      return;
    }

    // Check if we already processed this message
    const client = await getDbClient();
    try {
      const existingMessage = await client.query(
        'SELECT id FROM gmail_messages WHERE gmail_message_id = $1',
        [message.id]
      );

      if (existingMessage.rows.length > 0) {
        console.log('📧 Message already processed, skipping');
        return;
      }

      // Extract message body
      const bodyText = extractMessageBody(fullMessage.payload);
      
      // Check if this is a hot lead
      const hotLeadAnalysis = await analyzeForHotLead(bodyText, subject);
      
      // Find or create conversation
      let conversation = await findOrCreateConversation(
        client,
        gmailConnection,
        fullMessage.threadId,
        senderEmail,
        senderName,
        subject,
        hotLeadAnalysis
      );

      // Save the message
      await client.query(`
        INSERT INTO gmail_messages (
          conversation_id, gmail_message_id, thread_id, sender_type, 
          sender_email, subject, body_text, gmail_labels, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        conversation.id,
        message.id,
        fullMessage.threadId,
        'customer',
        senderEmail,
        subject,
        bodyText,
        JSON.stringify(fullMessage.labelIds || []),
        new Date()
      ]);

      console.log('✅ Gmail message saved to database');

      // Generate and send AI response if auto-response is enabled
      await generateAndSendAIResponse(gmail, gmailConnection, conversation, bodyText, subject, senderEmail);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error processing Gmail message:', error);
    throw error;
  }
}

async function findOrCreateConversation(client, gmailConnection, threadId, senderEmail, senderName, subject, hotLeadAnalysis) {
  // Check if conversation exists
  const existingConv = await client.query(
    'SELECT * FROM gmail_conversations WHERE thread_id = $1 AND customer_id = $2',
    [threadId, gmailConnection.customer_id]
  );

  if (existingConv.rows.length > 0) {
    // Update existing conversation
    const updated = await client.query(`
      UPDATE gmail_conversations 
      SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
          is_hot_lead = $1, hot_lead_score = $2
      WHERE id = $3 
      RETURNING *
    `, [hotLeadAnalysis.isHotLead, hotLeadAnalysis.score, existingConv.rows[0].id]);
    
    return updated.rows[0];
  } else {
    // Create new conversation
    const newConv = await client.query(`
      INSERT INTO gmail_conversations (
        customer_id, gmail_connection_id, thread_id, gmail_message_id,
        sender_email, sender_name, subject, status, is_hot_lead, hot_lead_score,
        last_message_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      gmailConnection.customer_id,
      gmailConnection.id,
      threadId,
      '', // Will be set when we process the message
      senderEmail,
      senderName,
      subject,
      'active',
      hotLeadAnalysis.isHotLead,
      hotLeadAnalysis.score
    ]);

    return newConv.rows[0];
  }
}

async function analyzeForHotLead(bodyText, subject) {
  try {
    // Simple keyword-based analysis (you can enhance with AI later)
    const hotKeywords = [
      'urgent', 'asap', 'immediately', 'today', 'now', 'quickly',
      'budget', 'price', 'cost', 'afford', 'ready to buy', 'buying',
      'need', 'want', 'looking for', 'interested', 'schedule', 'meet'
    ];

    const text = `${subject} ${bodyText}`.toLowerCase();
    let score = 0;
    let matchedKeywords = [];

    for (const keyword of hotKeywords) {
      if (text.includes(keyword)) {
        score += keyword.includes('urgent') || keyword.includes('asap') ? 3 : 1;
        matchedKeywords.push(keyword);
      }
    }

    const isHotLead = score >= 3 || matchedKeywords.some(k => 
      ['urgent', 'asap', 'immediately', 'ready to buy', 'buying'].includes(k)
    );

    return {
      isHotLead,
      score: Math.min(score, 10),
      keywords: matchedKeywords
    };

  } catch (error) {
    console.error('❌ Hot lead analysis error:', error);
    return { isHotLead: false, score: 0, keywords: [] };
  }
}

async function generateAndSendAIResponse(gmail, gmailConnection, conversation, bodyText, subject, senderEmail) {
  try {
    // Check if auto-response is enabled
    const client = await getDbClient();
    let autoResponseEnabled = true;
    
    try {
      const settingsResult = await client.query(
        'SELECT gmail_auto_response FROM email_settings WHERE customer_id = $1',
        [gmailConnection.customer_id]
      );
      
      if (settingsResult.rows.length > 0) {
        autoResponseEnabled = settingsResult.rows[0].gmail_auto_response !== false;
      }
    } finally {
      client.release();
    }

    if (!autoResponseEnabled) {
      console.log('📧 Auto-response disabled, skipping');
      return;
    }

    // Generate AI response
    const systemPrompt = `You are an AI email assistant. Generate a helpful, professional response to this email. Keep it concise but thorough.`;
    
    const userPrompt = `
Email Subject: ${subject}
Email Content: ${bodyText}

Generate a professional email response.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;

    // Send the response via Gmail
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    
    const rawMessage = createEmailMessage(
      gmailConnection.gmail_email,
      senderEmail,
      replySubject,
      aiResponse,
      conversation.thread_id
    );

    const sentMessage = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
        threadId: conversation.thread_id
      }
    });

    console.log('✅ AI response sent via Gmail:', sentMessage.data.id);

    // Save the AI response to database
    const client2 = await getDbClient();
    try {
      await client2.query(`
        INSERT INTO gmail_messages (
          conversation_id, gmail_message_id, thread_id, sender_type,
          sender_email, subject, body_text, is_ai_response, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `, [
        conversation.id,
        sentMessage.data.id,
        conversation.thread_id,
        'ai',
        gmailConnection.gmail_email,
        replySubject,
        aiResponse,
        true
      ]);

      // Update conversation
      await client2.query(
        'UPDATE gmail_conversations SET ai_response_sent = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversation.id]
      );

    } finally {
      client2.release();
    }

  } catch (error) {
    console.error('❌ Error generating/sending AI response:', error);
  }
}

// Utility functions
function extractEmailFromHeader(headerValue) {
  const match = headerValue.match(/<(.+?)>/) || headerValue.match(/(\S+@\S+)/);
  return match ? match[1] : headerValue.trim();
}

function extractNameFromHeader(headerValue) {
  const match = headerValue.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/['"]/g, '').trim() : '';
}

function extractMessageBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
  }
  
  return '';
}

function createEmailMessage(from, to, subject, body, threadId) {
  const email = [
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${threadId}`,
    `References: ${threadId}`,
    '',
    body
  ].join('\n');

  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
