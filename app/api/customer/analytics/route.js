// app/api/customer/analytics/route.js
// SIMPLIFIED VERSION - Now just 50 lines instead of 500+!
// All the complex logic is now in lib/analytics-service.js

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnalytics } from '@/lib/analytics-service.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/analytics
 * Fetch analytics for the authenticated customer
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'year' | 'all'
 * - channel: 'all' | 'email' | 'sms' | 'chat' | 'social'
 */
export async function GET(request) {
  try {
    // Authenticate user
    const { userId } = auth();
    
    if (!userId) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    console.log('📊 Analytics requested by user:', userId);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const channel = searchParams.get('channel') || 'all';
    
    console.log('📈 Fetching analytics:', { period, channel });
    
    // Call the centralized analytics service
    const result = await getAnalytics({
      clerkUserId: userId,
      channel: channel,
      period: period
    });
    
    // Return the result directly - the service handles everything!
    if (result.success) {
      console.log('✅ Analytics retrieved successfully');
      return NextResponse.json(result);
    } else {
      console.error('❌ Analytics error:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch analytics',
          analytics: result.analytics // Return empty analytics for fallback
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Analytics API Error:', error);
    
    // Import getEmptyAnalytics from the service for consistency
    const { getEmptyAnalytics } = await import('@/lib/analytics-service.js');
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        analytics: getEmptyAnalytics()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/analytics/refresh
 * Force refresh analytics cache (if you implement caching later)
 */
export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // For now, just call GET logic
    // Later you can add cache invalidation here
    const result = await getAnalytics({
      clerkUserId: userId,
      channel: 'all',
      period: 'month'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Analytics refreshed',
      analytics: result.analytics
    });
    
  } catch (error) {
    console.error('❌ Analytics refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh analytics' },
      { status: 500 }
    );
  }
}
