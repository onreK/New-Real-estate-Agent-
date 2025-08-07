// app/api/customer/analytics/route.js
// Complete Customer Analytics API - Fixed with proper auth
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get authenticated user ID
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get time period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, week, today, all
    
    // Get customer ID using the userId from auth
    const customerResult = await query(`
      SELECT id, business_name, created_at
      FROM customers 
      WHERE clerk_user_id = $1 OR user_id = $1
      LIMIT 1
    `, [userId]);
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Customer not found. Please complete your setup first.',
        analytics: getEmptyAnalytics()
      }, { status: 404 });
    }
    
    const customer = customerResult.rows[0];
    const customerId = customer.id;
    
    // Calculate date range
    const dateRange = getDateRange(period);
    
    // 📊 Get behavior event counts
    const behaviorCounts = await query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY event_type
      ORDER BY count DESC
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 📈 Get summary statistics
    const summaryStats = await query(`
      SELECT 
        COUNT(DISTINCT DATE(created_at)) as active_days,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_message) as unique_conversations,
        COUNT(DISTINCT channel) as channels_used
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 📱 Get channel breakdown
    const channelBreakdown = await query(`
      SELECT 
        channel,
        COUNT(*) as interactions,
        COUNT(*) FILTER (WHERE event_type = 'phone_request') as phone_requests,
        COUNT(*) FILTER (WHERE event_type = 'hot_lead') as hot_leads,
        COUNT(*) FILTER (WHERE event_type = 'appointment_scheduled') as appointments
      FROM ai_analytics_events
      WHERE customer_id = $1 
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY channel
      ORDER BY interactions DESC
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 🔥 Get hot leads details
    const hotLeads = await query(`
      SELECT 
        event_value,
        user_message,
        ai_response,
        created_at,
        metadata,
        channel
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND event_type = 'hot_lead'
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
      LIMIT 10
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 📅 Get daily trend data
    const dailyTrend = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_requests,
        COUNT(CASE WHEN event_type = 'appointment_scheduled' THEN 1 END) as appointments,
        COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_leads
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [customerId, dateRange.start, dateRange.end]);
    
    // ⏰ Get hourly activity patterns
    const hourlyActivity = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as interactions,
        COUNT(*) FILTER (WHERE event_type = 'hot_lead') as hot_leads
      FROM ai_analytics_events
      WHERE customer_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [customerId]);
    
    // 🎯 Get most effective behaviors
    const topBehaviors = await query(`
      SELECT 
        event_type,
        COUNT(*) as occurrences
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY event_type
      ORDER BY occurrences DESC
      LIMIT 5
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 🏆 Get conversion metrics
    const conversionMetrics = await query(`
      WITH total_interactions AS (
        SELECT COUNT(*) as total
        FROM ai_analytics_events
        WHERE customer_id = $1 
          AND created_at >= $2
          AND created_at <= $3
      )
      SELECT 
        (SELECT total FROM total_interactions) as total_interactions,
        COUNT(*) FILTER (WHERE event_type = 'phone_request') as phone_requests,
        COUNT(*) FILTER (WHERE event_type = 'appointment_scheduled') as appointments,
        COUNT(*) FILTER (WHERE event_type = 'hot_lead') as hot_leads,
        COUNT(*) FILTER (WHERE event_type = 'pricing_discussed') as pricing_discussions,
        CASE 
          WHEN (SELECT total FROM total_interactions) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'phone_request') * 100.0 / (SELECT total FROM total_interactions), 1)
          ELSE 0 
        END as phone_request_rate,
        CASE 
          WHEN (SELECT total FROM total_interactions) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'hot_lead') * 100.0 / (SELECT total FROM total_interactions), 1)
          ELSE 0 
        END as hot_lead_rate
      FROM ai_analytics_events
      WHERE customer_id = $1 
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 📝 Get recent events
    const recentEvents = await query(`
      SELECT 
        event_type,
        event_value,
        channel,
        created_at,
        metadata
      FROM ai_analytics_events
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [customerId]);
    
    // Calculate business value (estimated)
    const businessValue = calculateBusinessValue(behaviorCounts.rows);
    
    // Calculate effectiveness score
    const effectivenessScore = calculateEffectivenessScore(behaviorCounts.rows, summaryStats.rows[0]);
    
    // Generate insights
    const insights = generateInsights(behaviorCounts.rows, summaryStats.rows[0], channelBreakdown.rows);
    
    // Format the comprehensive analytics response
    const analytics = {
      // Core metrics
      period: period,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      
      // Overview section for dashboard
      overview: {
        effectiveness_score: effectivenessScore,
        total_interactions_month: parseInt(summaryStats.rows[0]?.total_events || 0),
        interactions_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.total_events || 0,
        hot_leads_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.hot_leads || 0,
        hot_leads_month: behaviorCounts.rows.find(b => b.event_type === 'hot_lead')?.count || 0,
        phone_requests_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.phone_requests || 0,
        phone_requests_month: behaviorCounts.rows.find(b => b.event_type === 'phone_request')?.count || 0,
        appointments_month: behaviorCounts.rows.find(b => b.event_type === 'appointment_scheduled')?.count || 0
      },
      
      // Summary statistics
      summary: {
        totalAIInteractions: parseInt(summaryStats.rows[0]?.total_events || 0),
        uniqueConversations: parseInt(summaryStats.rows[0]?.unique_conversations || 0),
        activeDays: parseInt(summaryStats.rows[0]?.active_days || 0),
        channelsUsed: parseInt(summaryStats.rows[0]?.channels_used || 0)
      },
      
      // Behavior breakdown
      behaviors: formatBehaviorCounts(behaviorCounts.rows),
      
      // Channel performance
      channels: channelBreakdown.rows.map(row => ({
        name: row.channel || 'unknown',
        interactions: parseInt(row.interactions) || 0,
        phone_requests: parseInt(row.phone_requests) || 0,
        hot_leads: parseInt(row.hot_leads) || 0,
        appointments: parseInt(row.appointments) || 0
      })),
      
      // Conversion metrics
      conversions: {
        total_interactions: parseInt(conversionMetrics.rows[0]?.total_interactions) || 0,
        phone_request_rate: parseFloat(conversionMetrics.rows[0]?.phone_request_rate) || 0,
        hot_lead_rate: parseFloat(conversionMetrics.rows[0]?.hot_lead_rate) || 0,
        appointments: parseInt(conversionMetrics.rows[0]?.appointments) || 0,
        pricing_discussions: parseInt(conversionMetrics.rows[0]?.pricing_discussions) || 0
      },
      
      // Activity patterns
      activity: {
        hourly: hourlyActivity.rows.map(row => ({
          hour: parseInt(row.hour),
          interactions: parseInt(row.interactions) || 0,
          hot_leads: parseInt(row.hot_leads) || 0
        })),
        weekly: dailyTrend.rows.slice(0, 7).map(row => ({
          date: row.date,
          interactions: parseInt(row.total_events) || 0,
          phone_requests: parseInt(row.phone_requests) || 0,
          hot_leads: parseInt(row.hot_leads) || 0
        }))
      },
      
      // Hot leads details
      hotLeads: {
        total: hotLeads.rows.length,
        list: hotLeads.rows.map(lead => ({
          date: lead.created_at,
          channel: lead.channel,
          message: lead.user_message?.substring(0, 100) + '...',
          response: lead.ai_response?.substring(0, 100) + '...',
          metadata: lead.metadata
        }))
      },
      
      // Business value calculation
      businessValue: businessValue,
      
      // Daily trend for charts
      dailyTrend: dailyTrend.rows.map(day => ({
        date: day.date,
        metrics: {
          total: parseInt(day.total_events),
          phoneRequests: parseInt(day.phone_requests),
          appointments: parseInt(day.appointments),
          hotLeads: parseInt(day.hot_leads)
        }
      })),
      
      // Top behaviors
      topBehaviors: topBehaviors.rows.map(behavior => ({
        type: formatEventType(behavior.event_type),
        count: parseInt(behavior.occurrences),
        percentage: summaryStats.rows[0]?.total_events > 0 
          ? ((behavior.occurrences / summaryStats.rows[0].total_events) * 100).toFixed(1)
          : 0
      })),
      
      // Recent events
      recent_events: recentEvents.rows.map(event => ({
        type: event.event_type,
        value: event.event_value,
        channel: event.channel,
        time: event.created_at,
        metadata: event.metadata
      })),
      
      // AI-generated insights
      insights: insights
    };
    
    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        business_name: customer.business_name,
        memberSince: customer.created_at
      },
      analytics: analytics,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message,
      analytics: getEmptyAnalytics()
    }, { status: 500 });
  }
}

/**
 * POST endpoint to manually refresh analytics
 */
export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1 OR user_id = $1 LIMIT 1',
      [userId]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No customer profile found'
      }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Update or create customer analytics summary
    await query(`
      INSERT INTO customer_analytics_summary (
        customer_id, month, updated_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (customer_id, month) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `, [customerId, currentMonth]);

    return NextResponse.json({
      success: true,
      message: 'Analytics refreshed successfully'
    });

  } catch (error) {
    console.error('❌ Analytics refresh error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Format behavior counts into readable metrics
 */
function formatBehaviorCounts(behaviors) {
  const formatted = {
    phoneRequests: 0,
    appointmentsScheduled: 0,
    hotLeadsDetected: 0,
    pricingDiscussed: 0,
    ctaIncluded: 0,
    advantagesHighlighted: 0,
    emailsRequested: 0,
    followupsOffered: 0,
    qualifyingQuestionsAsked: 0,
    urgencyCreated: 0
  };
  
  behaviors.forEach(behavior => {
    switch(behavior.event_type) {
      case 'phone_request':
        formatted.phoneRequests = parseInt(behavior.count);
        break;
      case 'appointment_scheduled':
        formatted.appointmentsScheduled = parseInt(behavior.count);
        break;
      case 'hot_lead':
        formatted.hotLeadsDetected = parseInt(behavior.count);
        break;
      case 'pricing_discussed':
        formatted.pricingDiscussed = parseInt(behavior.count);
        break;
      case 'cta_included':
        formatted.ctaIncluded = parseInt(behavior.count);
        break;
      case 'advantages_highlighted':
        formatted.advantagesHighlighted = parseInt(behavior.count);
        break;
      case 'email_request':
        formatted.emailsRequested = parseInt(behavior.count);
        break;
      case 'follow_up':
        formatted.followupsOffered = parseInt(behavior.count);
        break;
      case 'qualifying_questions':
        formatted.qualifyingQuestionsAsked = parseInt(behavior.count);
        break;
      case 'urgency_created':
        formatted.urgencyCreated = parseInt(behavior.count);
        break;
    }
  });
  
  return formatted;
}

/**
 * Calculate estimated business value
 */
function calculateBusinessValue(behaviors) {
  let totalValue = 0;
  const valueBreakdown = {};
  
  // Assign values to different behaviors
  const behaviorValues = {
    'phone_request': 50,
    'appointment_scheduled': 75,
    'hot_lead': 200,
    'pricing_discussed': 30,
    'email_request': 25,
    'follow_up': 20,
    'cta_included': 15,
    'advantages_highlighted': 10,
    'urgency_created': 35,
    'qualifying_questions': 15
  };
  
  behaviors.forEach(behavior => {
    const value = behaviorValues[behavior.event_type] || 10;
    const totalBehaviorValue = value * parseInt(behavior.count);
    totalValue += totalBehaviorValue;
    
    if (behaviorValues[behavior.event_type]) {
      valueBreakdown[behavior.event_type] = totalBehaviorValue;
    }
  });
  
  return {
    total: totalValue,
    breakdown: valueBreakdown,
    currency: 'USD',
    note: 'Estimated value based on typical conversion rates'
  };
}

/**
 * Calculate AI effectiveness score (0-100)
 */
function calculateEffectivenessScore(behaviors, summary) {
  const totalInteractions = parseInt(summary?.total_events || 0);
  if (totalInteractions === 0) return 0;
  
  // Find key behavior counts
  const phoneRequests = behaviors.find(b => b.event_type === 'phone_request');
  const appointments = behaviors.find(b => b.event_type === 'appointment_scheduled');
  const hotLeads = behaviors.find(b => b.event_type === 'hot_lead');
  
  const phoneCount = parseInt(phoneRequests?.count || 0);
  const appointmentCount = parseInt(appointments?.count || 0);
  const hotLeadCount = parseInt(hotLeads?.count || 0);
  
  // Calculate rates
  const phoneRate = (phoneCount / totalInteractions) * 100;
  const appointmentRate = (appointmentCount / totalInteractions) * 100;
  const hotLeadRate = (hotLeadCount / totalInteractions) * 100;
  
  // Weighted scoring: appointments (40%), hot leads (35%), phone requests (25%)
  const score = Math.min(100, Math.round(
    (appointmentRate * 4) + (hotLeadRate * 3.5) + (phoneRate * 2.5)
  ));
  
  return score;
}

/**
 * Generate insights from analytics data
 */
function generateInsights(behaviors, summary, channels) {
  const insights = [];
  const totalEvents = parseInt(summary?.total_events || 0);
  
  if (totalEvents === 0) {
    insights.push({
      type: 'info',
      message: 'Your AI hasn\'t processed any interactions yet. Make sure your channels are connected.',
      importance: 'high'
    });
    return insights;
  }
  
  // Success insights
  const hotLeadBehavior = behaviors.find(b => b.event_type === 'hot_lead');
  const hotLeads = parseInt(hotLeadBehavior?.count || 0);
  
  if (hotLeads > 5) {
    insights.push({
      type: 'success',
      message: `Great job! Your AI identified ${hotLeads} hot leads this period.`,
      importance: 'high'
    });
  }
  
  // Phone request performance
  const phoneRequests = behaviors.find(b => b.event_type === 'phone_request');
  const phoneCount = parseInt(phoneRequests?.count || 0);
  
  if (phoneCount > totalEvents * 0.3) {
    insights.push({
      type: 'success',
      message: 'Your AI is effectively capturing phone numbers from interested prospects.',
      importance: 'high'
    });
  }
  
  // Appointment success
  const appointments = behaviors.find(b => b.event_type === 'appointment_scheduled');
  const appointmentCount = parseInt(appointments?.count || 0);
  
  if (appointmentCount > 0) {
    insights.push({
      type: 'success',
      message: `${appointmentCount} appointments scheduled through AI this period!`,
      importance: 'high'
    });
  }
  
  // Channel insights
  if (channels && channels.length > 0) {
    const topChannel = channels[0];
    insights.push({
      type: 'info',
      message: `${topChannel.channel || 'Email'} is your most active channel with ${topChannel.interactions} interactions.`,
      importance: 'medium'
    });
  }
  
  // Conversion optimization
  if (phoneCount > 0 && appointmentCount > 0) {
    const conversionRate = (appointmentCount / phoneCount * 100).toFixed(0);
    if (conversionRate > 20) {
      insights.push({
        type: 'success',
        message: `Strong conversion: ${conversionRate}% of phone requests lead to appointments.`,
        importance: 'medium'
      });
    }
  }
  
  // Activity level
  if (totalEvents > 100) {
    insights.push({
      type: 'info',
      message: `High engagement with ${totalEvents} AI interactions this period.`,
      importance: 'medium'
    });
  }
  
  // Most common behavior
  if (behaviors.length > 0) {
    const topBehavior = behaviors[0];
    const percentage = ((topBehavior.count / totalEvents) * 100).toFixed(0);
    insights.push({
      type: 'info',
      message: `Your AI most frequently ${formatEventType(topBehavior.event_type)} (${percentage}% of interactions).`,
      importance: 'low'
    });
  }
  
  return insights;
}

/**
 * Format event type for display
 */
function formatEventType(eventType) {
  const formats = {
    'phone_request': 'requests phone numbers',
    'appointment_scheduled': 'schedules appointments',
    'hot_lead': 'detects hot leads',
    'pricing_discussed': 'discusses pricing',
    'cta_included': 'includes calls-to-action',
    'advantages_highlighted': 'highlights advantages',
    'email_request': 'requests emails',
    'follow_up': 'offers follow-ups',
    'qualifying_questions': 'asks qualifying questions',
    'urgency_created': 'creates urgency'
  };
  
  return formats[eventType] || eventType.replace(/_/g, ' ');
}

/**
 * Calculate date range based on period
 */
function getDateRange(period) {
  const end = new Date();
  let start = new Date();
  
  switch(period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'all':
      start = new Date('2024-01-01');
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Return empty analytics structure
 */
function getEmptyAnalytics() {
  return {
    period: 'month',
    overview: {
      effectiveness_score: 0,
      total_interactions_month: 0,
      interactions_today: 0,
      hot_leads_today: 0,
      hot_leads_month: 0,
      phone_requests_today: 0,
      phone_requests_month: 0,
      appointments_month: 0
    },
    summary: {
      totalAIInteractions: 0,
      uniqueConversations: 0,
      activeDays: 0,
      channelsUsed: 0
    },
    behaviors: {
      phoneRequests: 0,
      appointmentsScheduled: 0,
      hotLeadsDetected: 0,
      pricingDiscussed: 0,
      ctaIncluded: 0,
      advantagesHighlighted: 0,
      emailsRequested: 0,
      followupsOffered: 0,
      qualifyingQuestionsAsked: 0,
      urgencyCreated: 0
    },
    channels: [],
    conversions: {
      total_interactions: 0,
      phone_request_rate: 0,
      hot_lead_rate: 0,
      appointments: 0,
      pricing_discussions: 0
    },
    activity: {
      hourly: [],
      weekly: []
    },
    hotLeads: {
      total: 0,
      list: []
    },
    businessValue: {
      total: 0,
      breakdown: {},
      currency: 'USD',
      note: 'No data available'
    },
    dailyTrend: [],
    topBehaviors: [],
    recent_events: [],
    insights: []
  };
}
