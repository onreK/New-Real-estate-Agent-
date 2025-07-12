// app/api/instagram/status/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getInstagramConfig, 
  getConversationsToday, 
  calculateResponseRate 
} from '../../../../lib/instagram-config.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📸 Checking Instagram status for user:', userId);

    // Get Instagram configuration for this user
    const userConfig = getInstagramConfig(userId);
    
    if (!userConfig || !userConfig.accessToken || !userConfig.pageId) {
      return NextResponse.json({
        configured: false,
        conversationsToday: 0,
        responseRate: 0,
        status: 'not_configured'
      });
    }

    // If configured, check connection status
    try {
      // Test Instagram API connection
      const testResponse = await fetch(`https://graph.facebook.com/v18.0/${userConfig.pageId}?access_token=${userConfig.accessToken}`);
      
      if (!testResponse.ok) {
        console.log('❌ Instagram API connection failed');
        return NextResponse.json({
          configured: false,
          conversationsToday: 0,
          responseRate: 0,
          status: 'connection_error',
          error: 'Instagram API connection failed'
        });
      }

      // Get conversation stats (mock data for now)
      const conversationsToday = getConversationsToday(userId);
      const responseRate = calculateResponseRate(userId);

      console.log('✅ Instagram status check successful:', {
        configured: true,
        conversationsToday,
        responseRate
      });

      return NextResponse.json({
        configured: true,
        conversationsToday,
        responseRate,
        status: 'active',
        pageId: userConfig.pageId,
        businessName: userConfig.businessName,
        lastUpdated: userConfig.configuredAt || new Date().toISOString()
      });

    } catch (connectionError) {
      console.error('❌ Instagram connection test failed:', connectionError);
      return NextResponse.json({
        configured: false,
        conversationsToday: 0,
        responseRate: 0,
        status: 'connection_error',
        error: 'Failed to verify Instagram connection'
      });
    }

  } catch (error) {
    console.error('❌ Instagram status check error:', error);
    return NextResponse.json({
      configured: false,
      conversationsToday: 0,
      responseRate: 0,
      status: 'error',
      error: 'Internal server error'
    }, { status: 500 });
  }
}
