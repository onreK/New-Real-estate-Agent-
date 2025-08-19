// app/api/test-analytics/route.js
// TEST ROUTE - Check if analytics service is working
// You can delete this file once everything is confirmed working

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnalytics } from '@/lib/analytics-service.js';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Please log in to test analytics',
        tip: 'Make sure you are logged into your dashboard' 
      }, { status: 401 });
    }
    
    console.log('🧪 Testing analytics service for user:', userId);
    
    // Test 1: Check if database connection works
    let dbTest = { success: false, message: '' };
    try {
      const testQuery = await query('SELECT NOW() as current_time');
      dbTest = {
        success: true,
        message: 'Database connected',
        time: testQuery.rows[0].current_time
      };
    } catch (error) {
      dbTest = {
        success: false,
        message: 'Database connection failed',
        error: error.message
      };
    }
    
    // Test 2: Check if customer exists
    let customerTest = { success: false, message: '' };
    try {
      const customerResult = await query(
        'SELECT * FROM customers WHERE clerk_user_id = $1',
        [userId]
      );
      
      if (customerResult.rows[0]) {
        customerTest = {
          success: true,
          message: 'Customer found',
          customer: {
            id: customerResult.rows[0].id,
            business_name: customerResult.rows[0].business_name,
            created_at: customerResult.rows[0].created_at
          }
        };
      } else {
        customerTest = {
          success: false,
          message: 'No customer record found',
          tip: 'You may need to complete your business setup first'
        };
      }
    } catch (error) {
      customerTest = {
        success: false,
        message: 'Error checking customer',
        error: error.message
      };
    }
    
    // Test 3: Check if ai_analytics_events table exists and has data
    let eventsTest = { success: false, message: '' };
    try {
      const eventsResult = await query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT channel) as channels,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM ai_analytics_events
        WHERE customer_id = (
          SELECT id FROM customers WHERE clerk_user_id = $1 LIMIT 1
        )
      `, [userId]);
      
      const row = eventsResult.rows[0];
      eventsTest = {
        success: true,
        message: 'Events table accessible',
        data: {
          total_events: parseInt(row.total_events || 0),
          channels_used: parseInt(row.channels || 0),
          first_event: row.first_event,
          last_event: row.last_event,
          has_data: parseInt(row.total_events || 0) > 0
        }
      };
    } catch (error) {
      eventsTest = {
        success: false,
        message: 'Events table not accessible',
        error: error.message,
        tip: 'You may need to run the database migration'
      };
    }
    
    // Test 4: Try calling the analytics service
    let serviceTest = { success: false, message: '' };
    try {
      const analyticsResult = await getAnalytics({
        clerkUserId: userId,
        channel: 'all',
        period: 'month'
      });
      
      if (analyticsResult.success) {
        serviceTest = {
          success: true,
          message: 'Analytics service working!',
          sample_data: {
            total_interactions: analyticsResult.analytics?.overview?.total_interactions_month || 0,
            hot_leads: analyticsResult.analytics?.overview?.hot_leads_month || 0,
            effectiveness_score: analyticsResult.analytics?.overview?.effectiveness_score || 0,
            has_insights: analyticsResult.analytics?.insights?.length > 0
          }
        };
      } else {
        serviceTest = {
          success: false,
          message: 'Analytics service returned error',
          error: analyticsResult.error
        };
      }
    } catch (error) {
      serviceTest = {
        success: false,
        message: 'Failed to call analytics service',
        error: error.message
      };
    }
    
    // Compile results
    const allTestsPassed = dbTest.success && customerTest.success && 
                          eventsTest.success && serviceTest.success;
    
    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed 
        ? '✅ All systems operational! Analytics service is ready.'
        : '⚠️ Some tests failed. See details below.',
      tests: {
        '1_database': dbTest,
        '2_customer': customerTest,
        '3_events_table': eventsTest,
        '4_analytics_service': serviceTest
      },
      next_steps: allTestsPassed
        ? [
            'Your analytics service is working!',
            'Visit /dashboard to see your main dashboard',
            'Visit /analytics to see detailed analytics',
            'Visit /email to see email-specific stats'
          ]
        : [
            'Fix any failed tests above',
            'If customer not found: Complete your business setup',
            'If no events data: Start using the AI features to generate data',
            'If table missing: Run the database migration'
          ],
      quick_links: {
        main_analytics: '/api/customer/analytics',
        email_stats: '/api/customer/email-stats',
        test_30_days: '/api/customer/analytics?period=month',
        test_7_days: '/api/customer/analytics?period=week'
      }
    });
    
  } catch (error) {
    console.error('❌ Test route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}
