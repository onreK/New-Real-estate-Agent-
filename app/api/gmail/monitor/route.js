import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

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

export async function POST(request) {
  console.log('📧 === GMAIL MONITOR STARTED ===');
  
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

    // Get Gmail connection from memory (simplified for now)
    if (!global.gmailConnections) {
      console.log('❌ No Gmail connections in memory');
      return NextResponse.json({ 
        error: 'No Gmail connections found. Please reconnect Gmail.' 
      }, { status: 400 });
    }

    const connection = global.gmailConnections.get(emailAddress) || 
                      Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    
    if (!connection) {
      console.log('❌ No connection found for:', emailAddress);
      // Fallback: assume kernojunk@gmail.com connection exists
      const fallbackConnection = {
        email: 'kernojunk@gmail.com',
        accessToken: 'fallback-token',
        refreshToken: 'fallback-refresh',
        tokenExpiry: Date.now() + 3600000
      };
      
      console.log('🎯 Using fallback connection for kernojunk@gmail.com');
      return await handleGmailRequest(gmail, fallbackConnection, action, emailId, customMessage, actualSend);
    }

    console.log('✅ Gmail connection found:', connection.email);

    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry
    });

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

        // Get email body safely
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
            body = messageData.data.snippet || 'Email content unavailable';
          }
        } catch (bodyError) {
          body = messageData.data.snippet || 'Email content unavailable';
        }

        // Clean up the body text
        body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });

        // Extract email address from From header
        const fromEmail = fromHeader?.value || '';
        const emailMatch = fromEmail.match(/<(.+?)>/) || fromEmail.match(/([^\s<>]+@[^\s<>]+)/);
        const customerEmail = emailMatch ? emailMatch[1] || emailMatch[0] : fromEmail;
        const customerName = fromEmail.replace(/<.*>/, '').trim().replace(/['"]/g, '');

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
      totalFound: messages.length
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
