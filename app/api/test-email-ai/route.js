import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log('🧪 === EMAIL AI TEST STARTED ===');
  
  try {
    const { testEmail, testMessage } = await request.json();
    
    if (!testEmail || !testMessage) {
      return NextResponse.json({ 
        error: 'testEmail and testMessage are required' 
      }, { status: 400 });
    }

    console.log('📧 Testing email AI for:', testEmail);
    console.log('💬 Test message:', testMessage);

    // Check if Gmail connection exists
    if (!global.gmailConnections) {
      return NextResponse.json({ 
        error: 'No Gmail connections found. Please connect Gmail first.' 
      }, { status: 400 });
    }

    const connections = Array.from(global.gmailConnections.values());
    const gmailConnection = connections.find(conn => conn.status === 'connected');
    
    if (!gmailConnection) {
      return NextResponse.json({ 
        error: 'No active Gmail connection found. Please connect Gmail first.' 
      }, { status: 400 });
    }

    console.log('✅ Gmail connection found:', gmailConnection.email);

    // Check OpenAI connection
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    console.log('✅ OpenAI API key found');

    // Generate AI response
    const systemPrompt = `You are an AI assistant representing a professional business. You are responding to an email inquiry.

Key guidelines:
- Be professional and helpful
- Provide clear, useful information
- Keep responses concise but thorough
- If you cannot answer something specific, offer to connect them with a human team member
- Always maintain a positive, solution-oriented tone
- Sign the email appropriately

Business: ${gmailConnection.email.split('@')[0]} Business
Email: ${gmailConnection.email}`;

    console.log('🤖 Generating AI response...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: testMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No AI response generated');
    }

    console.log('✅ AI response generated');

    // Hot lead detection
    const hotLeadKeywords = [
      'urgent', 'asap', 'immediately', 'emergency', 'deadline',
      'budget', 'price', 'cost', 'money', 'payment', 'buy', 'purchase',
      'interested', 'ready to start', 'when can we', 'schedule',
      'meeting', 'call me', 'phone', 'contact'
    ];

    const messageText = testMessage.toLowerCase();
    const matchedKeywords = hotLeadKeywords.filter(keyword => 
      messageText.includes(keyword.toLowerCase())
    );

    const isHotLead = matchedKeywords.length > 0;

    console.log('🔥 Hot lead analysis:', { isHotLead, matchedKeywords });

    // Simulate email sending (for demo)
    console.log('📤 Would send email response to:', testEmail);

    return NextResponse.json({
      success: true,
      message: 'Email AI test completed successfully',
      data: {
        connectedGmail: gmailConnection.email,
        testRecipient: testEmail,
        originalMessage: testMessage,
        aiResponse: aiResponse,
        hotLead: {
          detected: isHotLead,
          keywords: matchedKeywords,
          score: matchedKeywords.length
        },
        emailWouldBeSent: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Email AI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Email AI test failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
