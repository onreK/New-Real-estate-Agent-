// app/api/customer/email-stats/route.js
// SIMPLIFIED VERSION - Now uses centralized analytics service directly!
// No more double API calls!

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEmailAnalytics } from '@/lib/analytics-service.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/email-stats
 * Get email-specific analytics for the dashboard
 */
export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('📧 Email stats requested by user:', userId);

    // Call the centralized analytics service for email channel
    const result = await getEmailAnalytics(userId);
    
    if (result.success && result.analytics) {
      const analytics = result.analytics;
      
      // Format response for backward compatibility with your dashboard
      return NextResponse.json({
        success: true,
        stats: {
          // Basic metrics
          totalConversations: analytics.overview?.total_interactions_month || 0,
          activeToday: analytics.overview?.interactions_today || 0,
          
          // NEW metrics (better than old broken ones!)
          aiEngagementRate: analytics.overview?.ai_engagement_rate || 0,
          contactCaptureRate: analytics.overview?.contact_capture_rate || 0,
          avgResponseTimeMinutes: analytics.overview?.avg_response_speed_minutes || 0,
          totalLeadsCaptured: analytics.overview?.total_leads_captured || 0,
          
          // Email-specific metrics
          emailThreads: analytics.metrics?.channelSpecific?.email?.total_threads || 0,
          emailOpenRate: analytics.metrics?.channelSpecific?.email?.open_rate || 0,
          emailClickRate: analytics.metrics?.channelSpecific?.email?.click_rate || 0,
          
          // Legacy compatibility fields (for old dashboard code)
          responseRate: analytics.overview?.ai_engagement_rate || 0,
          avgResponseTime: Math.round(analytics.overview?.avg_response_speed_minutes || 0)
        },
        customer: {
          id: result.customer?.id || 'temp_customer',
          business_name: result.customer?.business_name || 'My Business',
          email: result.customer?.email || 'user@example.com'
        },
        // Include full analytics for components that need it
        analytics: analytics
      });
      
    } else {
      // Return fallback data if analytics service fails
      console.log('⚠️ Email stats fallback mode');
      
      return NextResponse.json({
        success: true,
        stats: {
          totalConversations: 0,
          activeToday: 0,
          aiEngagementRate: 0,
          contactCaptureRate: 0,
          avgResponseTimeMinutes: 0,
          totalLeadsCaptured: 0,
          emailThreads: 0,
          emailOpenRate: 0,
          emailClickRate: 0,
          responseRate: 0,
          avgResponseTime: 0
        },
        customer: {
          id: 'temp_customer',
          business_name: 'My Business',
          email: 'user@example.com'
        }
      });
    }

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
