import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Email stats API called for user:', userId);

    // 🎯 NEW: Fetch real analytics data instead of mock data
    try {
      const analyticsResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/customer/analytics?period=month`,
        {
          headers: {
            'Authorization': `Bearer ${userId}`,
            'x-user-id': userId
          }
        }
      );

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        
        if (analyticsData.success && analyticsData.analytics) {
          const analytics = analyticsData.analytics;
          
          // ✅ Return NEW metrics instead of old broken ones
          return NextResponse.json({
            success: true,
            stats: {
              // Keep existing simple metrics
              totalConversations: analytics.overview?.total_interactions_month || 0,
              activeToday: analytics.overview?.interactions_today || 0,
              
              // 🎯 NEW METRICS (replace old broken ones):
              aiEngagementRate: analytics.overview?.ai_engagement_rate || 0,
              contactCaptureRate: analytics.overview?.contact_capture_rate || 0,
              avgResponseTimeMinutes: analytics.overview?.avg_response_speed_minutes || 0,
              totalLeadsCaptured: analytics.overview?.total_leads_captured || 0,
              
              // Legacy compatibility (for any remaining old code)
              responseRate: analytics.overview?.ai_engagement_rate || 0, // Map to engagement rate
              avgResponseTime: Math.round(analytics.overview?.avg_response_speed_minutes || 0) // Convert to whole minutes
            },
            customer: {
              id: analyticsData.customer?.id || 'temp_customer',
              business_name: analyticsData.customer?.business_name || 'My Business',
              email: 'user@example.com'
            }
          });
        }
      }
    } catch (analyticsError) {
      console.log('📊 Analytics API not available, using fallback data:', analyticsError.message);
    }

    // Fallback: Return default values if analytics API is not available
    return NextResponse.json({
      success: true,
      stats: {
        totalConversations: 0,
        activeToday: 0,
        // 🎯 NEW METRICS with default values:
        aiEngagementRate: 0,
        contactCaptureRate: 0,
        avgResponseTimeMinutes: 0,
        totalLeadsCaptured: 0,
        // Legacy compatibility
        responseRate: 0,
        avgResponseTime: 0
      },
      customer: {
        id: 'temp_customer',
        business_name: 'My Business',
        email: 'user@example.com'
      }
    });

  } catch (error) {
    console.error('❌ Email stats API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load email stats',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
