import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { getCustomerByClerkId, getCustomerStats, getConversationsByCustomer } from '../../../lib/database.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the action parameter from URL
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('🔍 Chat API GET called with action:', action, 'for user:', userId);

    if (action === 'test-connection') {
      // Test OpenAI connection
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      
      return NextResponse.json({
        success: true,
        connected: hasApiKey,
        status: hasApiKey ? 'connected' : 'disconnected',
        model: hasApiKey ? 'gpt-4o-mini' : null
      });
    }

    if (action === 'conversations') {
      // Get customer and their conversations
      try {
        const customer = await getCustomerByClerkId(userId);
        
        if (!customer) {
          return NextResponse.json({
            success: true,
            conversations: [],
            totalConversations: 0,
            totalMessages: 0,
            leadsGenerated: 0
          });
        }

        const conversations = await getConversationsByCustomer(customer.id);
        const stats = await getCustomerStats(customer.id);

        return NextResponse.json({
          success: true,
          conversations: conversations || [],
          totalConversations: stats.totalConversations || 0,
          totalMessages: stats.totalMessages || 0,
          leadsGenerated: 0 // Calculate from conversations if needed
        });

      } catch (error) {
        console.error('❌ Error getting conversations:', error);
        return NextResponse.json({
          success: true,
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          error: 'Database error'
        });
      }
    }

    // Default response for unknown actions
    return NextResponse.json({
      success: true,
      message: 'Chat API is working',
      availableActions: ['conversations', 'test-connection']
    });

  } catch (error) {
    console.error('❌ Chat GET API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body;

    console.log('💬 Chat POST called for user:', userId);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1];
    if (!userMessage || !userMessage.content) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }

    // Check if OpenAI is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        message: "Hello! I'm your AI assistant. However, OpenAI is not configured yet. Please add your OpenAI API key in settings.",
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Simple OpenAI chat completion
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for a business. Be professional, friendly, and helpful.'
          },
          ...messages.map(msg => ({
            role: msg.role || (msg.content ? 'user' : 'assistant'),
            content: msg.content || msg.message
          }))
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

      return NextResponse.json({
        success: true,
        message: aiResponse,
        timestamp: new Date().toISOString()
      });

    } catch (aiError) {
      console.error('❌ OpenAI API Error:', aiError);
      
      return NextResponse.json({
        success: true,
        message: "Hello! I'm your AI assistant. I'm having trouble connecting to my AI brain right now, but I'm here to help however I can!",
        error: 'OpenAI API error',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Chat POST API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat request',
      details: error.message
    }, { status: 500 });
  }
}
