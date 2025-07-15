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
    const { action, emailAddress, emailId, customMessage } = body;
    
    console.log('📧 Action:', action);
    console.log('📧 Email:', emailAddress);
    
    if (!emailAddress) {
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 });
    }

    // Get Gmail connection from memory
    if (!global.gmailConnections) {
      console.log('❌ No Gmail connections in memory');
      return NextResponse.json({ 
        error: 'No Gmail connections found. Please reconnect Gmail.' 
      }, { status: 400 });
    }

    console.log('🔍 Available connections:', Array.from(global.gmailConnections.keys()));

    const connection = global.gmailConnections.get(emailAddress) || 
                      Array.from(global.gmailConnections.values()).find(conn => conn.email === emailAddress);
    
    if (!connection) {
      console.log('❌ No connection found for:', emailAddress);
      return NextResponse.json({ 
        error: `Gmail connection not found for ${emailAddress}. Please reconnect Gmail.` 
      }, { status: 404 });
    }

    console.log('✅ Gmail connection found:', connection.email);
    console.log('🔑 Access token exists:', !!connection.accessToken);
    console.log('🔄 Refresh token exists:', !!connection.refreshToken);

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
      
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 5
        });

        const messages = response.data.messages || [];
        console.log(`📬 Found ${messages.length} unread emails`);

        const emailDetails = [];

        for (const message of messages.slice(0, 3)) { // Limit to 3 for demo
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
                  part.mimeType === 'text/plain' || part.mimeType === 'text/html'
                );
                if (textPart?.body?.data) {
                  body = Buffer.from(textPart.body.data, 'base64').toString();
                }
              }
            } catch (bodyError) {
              console.log('⚠️ Could not decode email body:', bodyError.message);
              body = messageData.data.snippet || 'Email content unavailable';
            }

            emailDetails.push({
              id: message.id,
              threadId: messageData.data.threadId,
              from: fromHeader?.value || 'Unknown',
              subject: subjectHeader?.value || 'No Subject',
              date: dateHeader?.value || 'Unknown',
              body: body.substring(0, 300), // First 300 chars
              snippet: messageData.data.snippet
            });

          } catch (messageError) {
            console.error('❌ Error getting message details:', messageError.message);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Found ${messages.length} unread emails`,
          emails: emailDetails,
          connectedEmail: connection.email,
          totalFound: messages.length
        });

      } catch (gmailError) {
        console.error('❌ Gmail API error:', gmailError.message);
        
        if (gmailError.message.includes('invalid_grant') || gmailError.message.includes('unauthorized')) {
          return NextResponse.json({
            error: 'Gmail authentication expired. Please reconnect Gmail.',
            needsReauth: true
          }, { status: 401 });
        }
        
        throw gmailError;
      }
    }

    if (action === 'respond') {
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

        console.log('📧 Original email from:', fromHeader?.value);
        console.log('📧 Original subject:', subjectHeader?.value);

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
          console.log('⚠️ Using snippet instead of full body');
          originalBody = messageData.data.snippet || 'Email content unavailable';
        }

        console.log('📝 Original body preview:', originalBody.substring(0, 100));

        // Check OpenAI availability
        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json({
            error: 'OpenAI API key not configured'
          }, { status: 500 });
        }

        // Generate AI response
        const systemPrompt = `You are a professional AI assistant representing the business associated with ${connection.email}. 

You are responding to a customer email. Be helpful, professional, and provide useful information.

Key guidelines:
- Be friendly but professional
- Keep responses concise but informative  
- If you cannot answer something specific, offer to connect them with a human team member
- Always maintain a positive tone
- End with a professional signature

Business Email: ${connection.email}`;

        console.log('🤖 Calling OpenAI...');

        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: customMessage || originalBody }
          ],
          max_tokens: 300,
          temperature: 0.7,
        });

        const aiText = aiResponse.choices[0]?.message?.content;

        if (!aiText) {
          throw new Error('No AI response generated');
        }

        console.log('✅ AI response generated');
        console.log('🤖 AI response preview:', aiText.substring(0, 100));

        // For demo purposes, just return the response without actually sending
        // (To avoid potential email sending issues)
        return NextResponse.json({
          success: true,
          message: 'AI response generated successfully',
          demo: true,
          data: {
            originalFrom: fromHeader?.value,
            originalSubject: subjectHeader?.value,
            originalBody: originalBody.substring(0, 200),
            aiResponse: aiText,
            wouldReplyTo: fromHeader?.value,
            timestamp: new Date().toISOString()
          }
        });

      } catch (responseError) {
        console.error('❌ Error generating response:', responseError.message);
        
        return NextResponse.json({
          error: 'Failed to generate AI response',
          details: responseError.message
        }, { status: 500 });
      }
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
