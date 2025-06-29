// app/api/email/webhook/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { 
  getCustomerByClerkId,
  createEmailConversation,
  getEmailConversationByAddress,
  getEmailConversationByThreadId,
  createEmailMessage,
  createHotLeadAlert,
  getEmailMessages
} from '../../../../lib/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Hot lead detection keywords (same as your SMS system)
const HOT_LEAD_KEYWORDS = [
  'urgent', 'asap', 'immediately', 'emergency', 'deadline',
  'budget', 'price', 'cost', 'money', 'payment', 'buy', 'purchase',
  'interested', 'ready to start', 'when can we', 'schedule',
  'meeting', 'call me', 'phone', 'contact',
  'problem', 'issue', 'broken', 'not working', 'help',
  'competitor', 'other company', 'comparing', 'quote'
];

export async function POST(request) {
  try {
    console.log('📧 Email webhook received');
    
    const body = await request.json();
    console.log('📧 Email webhook body:', JSON.stringify(body, null, 2));

    // Extract email data from webhook (adjust based on your email provider)
    const {
      from,
      to,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
      threadId,
      clerkUserId // You'll need to pass this or determine it from the business email
    } = body;

    if (!from || !to || !text) {
      console.log('❌ Missing required email fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get customer from the business email or clerkUserId
    let customer;
    if (clerkUserId) {
      customer = await getCustomerByClerkId(clerkUserId);
    } else {
      // If no clerkUserId, you might need to find customer by business email
      // This would require adding business_email to your customers table
      console.log('❌ No customer identification method provided');
      return NextResponse.json({ error: 'Cannot identify customer' }, { status: 400 });
    }

    if (!customer) {
      console.log('❌ Customer not found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    console.log('✅ Customer found:', customer.business_name);

    // Find or create email conversation
    let emailConversation;
    
    if (threadId) {
      // Try to find existing conversation by thread ID
      emailConversation = await getEmailConversationByThreadId(threadId);
    }
    
    if (!emailConversation) {
      // Try to find existing conversation by customer email
      emailConversation = await getEmailConversationByAddress(from, customer.id);
    }
    
    if (!emailConversation) {
      // Create new email conversation
      emailConversation = await createEmailConversation({
        customer_id: customer.id,
        customer_email: from,
        business_email: to,
        subject: subject || 'New Email Conversation',
        thread_id: threadId,
        status: 'active'
      });
    }

    console.log('✅ Email conversation:', emailConversation.id);

    // Save incoming email message
    const incomingMessage = await createEmailMessage({
      conversation_id: emailConversation.id,
      sender: 'customer',
      content: text,
      html_content: html,
      message_id: messageId,
      in_reply_to: inReplyTo
    });

    console.log('✅ Incoming email message saved');

    // Hot lead detection
    const messageText = text.toLowerCase();
    const matchedKeywords = HOT_LEAD_KEYWORDS.filter(keyword => 
      messageText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      await createHotLeadAlert({
        conversation_id: emailConversation.id,
        customer_id: customer.id,
        trigger_message: text,
        keywords_matched: matchedKeywords,
        status: 'new'
      });
      
      console.log('🔥 Hot lead detected in email!', matchedKeywords);
      
      // Send business owner alert (you can integrate with your existing SMS alert system)
      try {
        await sendBusinessOwnerEmailAlert(customer, emailConversation, matchedKeywords, text);
      } catch (alertError) {
        console.error('❌ Error sending business owner alert:', alertError);
      }
    }

    // Generate AI response
    const aiResponse = await generateEmailResponse(customer, emailConversation.id, text);
    
    if (aiResponse) {
      // Save AI response message
      const responseMessage = await createEmailMessage({
        conversation_id: emailConversation.id,
        sender: 'ai',
        content: aiResponse.text,
        html_content: aiResponse.html
      });

      // Send AI response email
      await sendEmailResponse({
        to: from,
        from: to,
        subject: inReplyTo ? `Re: ${subject}` : subject,
        text: aiResponse.text,
        html: aiResponse.html,
        inReplyTo: messageId,
        threadId: threadId || emailConversation.thread_id
      });

      console.log('✅ AI response sent');
    }

    return NextResponse.json({ 
      success: true, 
      conversationId: emailConversation.id,
      hotLead: matchedKeywords.length > 0 
    });

  } catch (error) {
    console.error('❌ Email webhook error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

async function generateEmailResponse(customer, conversationId, customerMessage) {
  try {
    // Get conversation history
    const messages = await getEmailMessages(conversationId);
    
    // Build conversation context
    const conversationHistory = messages.map(msg => ({
      role: msg.sender === 'customer' ? 'user' : 'assistant',
      content: msg.content
    })).slice(-10); // Last 10 messages for context

    // AI personality prompt (same style as your chat system)
    const systemPrompt = `You are an AI assistant representing ${customer.business_name}. You are professional, helpful, and knowledgeable about the business.

Key guidelines:
- Be friendly but professional in email communication
- Provide helpful information about the business services
- If you cannot answer something specific, offer to connect them with a human team member
- Keep responses concise but thorough
- Always maintain a positive, solution-oriented tone
- Sign emails appropriately for the business

Business: ${customer.business_name}
Communication method: Email`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: customerMessage }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiText = response.choices[0]?.message?.content;
    
    if (!aiText) {
      throw new Error('No AI response generated');
    }

    // Convert to HTML for email
    const aiHtml = aiText
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return {
      text: aiText,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${aiHtml}
          <br>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            This email was generated by AI on behalf of ${customer.business_name}. 
            If you need to speak with a human team member, please let us know.
          </p>
        </div>
      `
    };

  } catch (error) {
    console.error('❌ Error generating AI email response:', error);
    return null;
  }
}

async function sendEmailResponse(emailData) {
  try {
    const result = await resend.emails.send({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      headers: {
        'In-Reply-To': emailData.inReplyTo,
        'References': emailData.inReplyTo,
        'Thread-Index': emailData.threadId
      }
    });

    console.log('✅ Email sent via Resend:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

async function sendBusinessOwnerEmailAlert(customer, emailConversation, keywords, triggerMessage) {
  try {
    const alertHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #e74c3c;">🔥 Hot Lead Alert - Email</h2>
        <p><strong>Business:</strong> ${customer.business_name}</p>
        <p><strong>Customer Email:</strong> ${emailConversation.customer_email}</p>
        <p><strong>Subject:</strong> ${emailConversation.subject}</p>
        <p><strong>Keywords Detected:</strong> ${keywords.join(', ')}</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Customer Message:</strong><br>
          ${triggerMessage.replace(/\n/g, '<br>')}
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Log in to your IntelliHub dashboard to respond to this hot lead.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: 'alerts@intellihub.ai',
      to: customer.email,
      subject: `🔥 Hot Lead Alert: ${customer.business_name}`,
      html: alertHtml
    });

    console.log('✅ Business owner email alert sent');
  } catch (error) {
    console.error('❌ Error sending business owner email alert:', error);
    throw error;
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Email webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
