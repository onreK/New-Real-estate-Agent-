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
    const { action, emailAddress } = await request.json();
    
    if (!emailAddress) {
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 });
    }

    // Get Gmail connection from memory
    if (!global.gmailConnections) {
      return NextResponse.json({ 
        error: 'No Gmail connections found' 
      }, { status: 400 });
    }

    const connection = global.gmailConnections.get(emailAddress) || 
                      Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    
    if (!connection) {
      return NextResponse.json({ 
        error: 'Gmail connection not found for this email' 
      }, { status: 404 });
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
      // Check for new unread emails
      console.log('🔍 Checking for new emails...');
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 5
      });

      const messages = response.data.messages || [];
      console.log(`📬 Found ${messages.length} unread emails`);

      const emailDetails = [];

      for (const message of messages) {
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

          // Get email body
          let body = '';
          if (messageData.data.payload.body.data) {
            body = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
          } else if (messageData.data.payload.parts) {
            const textPart = messageData.data.payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString();
            }
          }

          emailDetails.push({
            id: message.id,
            threadId: messageData.data.threadId,
            from: fromHeader?.value || 'Unknown',
            subject: subjectHeader?.value || 'No Subject',
            date: dateHeader?.value || 'Unknown',
            body: body.substring(0, 500), // First 500 chars
            snippet: messageData.data.snippet
          });

        } catch (error) {
          console.error('❌ Error getting message details:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Found ${messages.length} unread emails`,
        emails: emailDetails,
        connectedEmail: connection.email
      });
    }

    if (action === 'respond') {
      const { emailId, customMessage } = await request.json();
      
      if (!emailId) {
        return NextResponse.json({ 
          error: 'Email ID is required for response' 
        }, { status: 400 });
      }

      console.log('🤖 Generating AI response for email:', emailId);

      // Get the original email
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const headers = messageData.data.payload.headers;
      const fromHeader = headers.find(h => h.name === 'From');
      const subjectHeader = headers.find(h => h.name === 'Subject');

      // Get email body
      let originalBody = '';
      if (messageData.data.payload.body.data) {
        originalBody = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
      } else if (messageData.data.payload.parts) {
        const textPart = messageData.data.payload.parts.find(part => part.mimeType === 'text/plain');
        if (textPart && textPart.body.data) {
          originalBody = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      // Generate AI response
      const systemPrompt = `You are an AI assistant representing ${connection.email.split('@')[0]} Business. You are responding to a customer email.

Key guidelines:
- Be professional and helpful
- Provide clear, useful information  
- Keep responses concise but thorough
- Always maintain a positive, solution-oriented tone
- Sign the email appropriately
- If you cannot answer something specific, offer to connect them with a human team member

Business Email: ${connection.email}
Your Name: AI Assistant for ${connection.email.split('@')[0]} Business`;

      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: customMessage || originalBody }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const aiText = aiResponse.choices[0]?.message?.content;

      if (!aiText) {
        throw new Error('No AI response generated');
      }

      // Create reply email
      const originalSubject = subjectHeader?.value || 'Re: Your inquiry';
      const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      
      const fromEmail = fromHeader?.value || '';
      const replyTo = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;

      const emailBody = `${aiText}

--
Best regards,
AI Assistant
${connection.email.split('@')[0]} Business
${connection.email}

This email was generated by AI. If you need to speak with a human representative, please let us know.`;

      // Send the reply (using Gmail API)
      const rawMessage = createRawEmail(
        connection.email,
        replyTo,
        replySubject,
        emailBody,
        messageData.data.id
      );

      const sendResponse = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
          threadId: messageData.data.threadId
        }
      });

      console.log('✅ AI response sent successfully');

      // Mark original email as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      return NextResponse.json({
        success: true,
        message: 'AI response sent successfully',
        data: {
          originalFrom: fromHeader?.value,
          originalSubject: subjectHeader?.value,
          aiResponse: aiText,
          sentTo: replyTo,
          messageId: sendResponse.data.id
        }
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use "check" or "respond"' 
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Gmail monitor error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Gmail monitor failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to create raw email format
function createRawEmail(from, to, subject, body, inReplyTo) {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${inReplyTo}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ];

  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
