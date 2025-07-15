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

    // Simple connection check - assume kernojunk@gmail.com is connected
    let connection = null;
    
    // Check memory storage first
    if (global.gmailConnections) {
      console.log('🔍 Checking memory storage...');
      connection = global.gmailConnections.get(emailAddress) || 
                   Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    }
    
    // Fallback for kernojunk@gmail.com since we know it's connected
    if (!connection && emailAddress === 'kernojunk@gmail.com') {
      console.log('🎯 Using fallback connection for kernojunk@gmail.com');
      // We'll try to use existing tokens if available, or skip OAuth for now
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
        error: `Gmail connection not found for ${emailAddress}. Please reconnect Gmail.`,
        suggestion: 'Try using the Advanced Testing page or reconnect Gmail'
      }, { status: 404 });
    }

    console.log('✅ Gmail connection found:', connection.email);

    // Set up OAuth client
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry
    });

    // Try to refresh tokens if needed
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('✅ Tokens refreshed successfully');
    } catch (refreshError) {
      console.error('⚠️ Token refresh failed:', refreshError.message);
      return NextResponse.json({ 
        error: 'Gmail connection expired. Please reconnect your account.',
        suggestion: 'Click Connect Gmail button to reauthenticate'
      }, { status: 401 });
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
      details: error.message,
      suggestion: 'Try reconnecting Gmail or using the Advanced Testing page'
    }, { status: 500 });
  }
}

async function checkForNewEmails(gmail, connection) {
  try {
    console.log('🔍 Checking for new emails...');

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

        // Clean up body text
        body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });

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
    return NextResponse.json({
      success: false,
      error: 'Failed to check emails',
      details: error.message
    }, { status: 500 });
  }
}

async function respondToEmail(gmail, connection, emailId, customMessage, actualSend) {
  if (!emailId) {
    return NextResponse.json({ 
      error: 'Email ID is required for response' 
    }, { status: 400 });
  }

  console.log('🤖 Generating AI response for email:', emailId);

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

    // Generate AI response
    const businessName = connection.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
    
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional AI assistant representing ${businessName}. Respond helpfully and professionally to customer inquiries. Keep responses concise but informative.`
        },
        {
          role: 'user',
          content: customMessage || originalBody
        }
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    const aiText = aiResponse.choices[0]?.message?.content;
    if (!aiText) {
      throw new Error('No AI response generated');
    }

    const originalSubject = subjectHeader?.value || 'Your inquiry';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    const emailBody = `${aiText}

--
Best regards,
AI Assistant
${businessName}
${connection.email}

📧 This email was automatically generated by Bizzy Bot AI`;

    if (actualSend) {
      // Create and send email
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

      return NextResponse.json({
        success: true,
        message: 'AI response sent successfully!',
        actualSent: true,
        data: {
          messageId: sendResponse.data.id,
          aiResponse: aiText,
          sentTo: replyToEmail
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'AI response generated (preview)',
        preview: true,
        data: {
          aiResponse: aiText,
          wouldReplyTo: replyToEmail,
          emailBody: emailBody
        }
      });
    }

  } catch (error) {
    console.error('❌ Error with AI response:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate AI response',
      details: error.message
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Gmail Monitor API',
    status: 'Active',
    endpoints: {
      check: 'POST with action: "check"',
      respond: 'POST with action: "respond", emailId required'
    }
  });
}
