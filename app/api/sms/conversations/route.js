import { NextResponse } from 'next/server';

// Import conversation functions from webhook
async function getSMSData() {
  try {
    // Import the functions from the webhook route
    const webhookModule = await import('../webhook/route.js');
    const conversations = webhookModule.getSMSConversations();
    const smsLeads = webhookModule.getSMSLeads();
    
    return { conversations, smsLeads };
  } catch (error) {
    console.error('Error getting SMS data:', error);
    return { conversations: [], smsLeads: [] };
  }
}

function calculateStats(conversations, smsLeads) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const totalMessages = conversations.reduce((total, conv) => total + conv.messages.length, 0);
  
  const activeConversations = conversations.filter(conv => 
    new Date(conv.lastActivity) > twentyFourHoursAgo
  ).length;

  return {
    totalConversations: conversations.length,
    totalMessages,
    activeConversations,
    smsLeads: smsLeads.length
  };
}

export async function GET() {
  try {
    const { conversations, smsLeads } = await getSMSData();
    
    // Sort conversations by last activity (most recent first)
    const sortedConversations = conversations.sort((a, b) => 
      new Date(b.lastActivity) - new Date(a.lastActivity)
    );

    const stats = calculateStats(conversations, smsLeads);

    console.log('📊 SMS Dashboard Data:', {
      conversations: conversations.length,
      totalMessages: stats.totalMessages,
      activeConversations: stats.activeConversations,
      leads: smsLeads.length
    });

    return NextResponse.json({
      success: true,
      conversations: sortedConversations,
      leads: smsLeads,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SMS Conversations API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      conversations: [],
      leads: [],
      stats: {
        totalConversations: 0,
        totalMessages: 0,
        activeConversations: 0,
        smsLeads: 0
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, conversationId, message } = await request.json();

    if (action === 'send_message') {
      // Send manual SMS message
      // This would integrate with Twilio to send messages
      // For now, return success
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully'
      });
    }

    if (action === 'mark_read') {
      // Mark conversation as read
      return NextResponse.json({
        success: true,
        message: 'Conversation marked as read'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ SMS Action Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
