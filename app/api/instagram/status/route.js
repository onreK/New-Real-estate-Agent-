// app/api/instagram/status/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

// In-memory storage for Instagram configurations (replace with database in production)
const instagramConfigs = new Map();

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📸 Checking Instagram status for user:', user.id);

    // Check if user has Instagram configuration
    const userConfig = instagramConfigs.get(user.id);
    
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
      const conversationsToday = getConversationsToday(user.id);
      const responseRate = calculateResponseRate(user.id);

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
        lastUpdated: userConfig.lastUpdated || new Date().toISOString()
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

// Mock function to get today's conversations count
function getConversationsToday(userId) {
  // In production, this would query your database for Instagram conversations from today
  const userConfig = instagramConfigs.get(userId);
  return userConfig?.conversationsToday || 0;
}

// Mock function to calculate response rate
function calculateResponseRate(userId) {
  // In production, this would calculate the actual AI response rate
  const userConfig = instagramConfigs.get(userId);
  return userConfig?.responseRate || 0;
}

// Export the config map for use by other Instagram API routes
export { instagramConfigs };
