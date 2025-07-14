import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Checking Gmail connection status for user:', userId);

    // Check if Gmail connection exists in memory
    const gmailConnection = global.gmailConnections?.get(userId);
    
    if (gmailConnection && gmailConnection.status === 'connected') {
      console.log('✅ Gmail connection found in memory:', gmailConnection.email);
      
      return NextResponse.json({
        success: true,
        connected: true,
        email: gmailConnection.email,
        status: 'connected',
        connectedAt: gmailConnection.connectedAt
      });
    }

    console.log('❌ No Gmail connection found for user:', userId);
    
    return NextResponse.json({
      success: true,
      connected: false,
      email: null,
      status: 'disconnected'
    });

  } catch (error) {
    console.error('❌ Gmail status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check Gmail connection status',
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

    // This endpoint can be used to manually disconnect Gmail
    if (global.gmailConnections?.has(userId)) {
      global.gmailConnections.delete(userId);
      console.log('🗑️ Gmail connection removed for user:', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail connection removed'
    });

  } catch (error) {
    console.error('❌ Gmail disconnect error:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect Gmail',
      details: error.message 
    }, { status: 500 });
  }
}
