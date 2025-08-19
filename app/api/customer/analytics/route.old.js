// app/api/customer/analytics/route.js
// Updated Customer Analytics API with Better Metrics for B2B Automation
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
    const period = searchParams.get('period') || 'month';
    
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
    
    // 🎯 NEW METRIC 1: AI Engagement Rate
    // Calculate % of AI responses that get customer replies
    const engagementRate = await query(`
      WITH ai_responses AS (
        SELECT 
          id,
          created_at,
          user_message,
          ai_response,
          -- Check if there's a customer reply within 48 hours after this AI response
          EXISTS(
            SELECT 1 FROM ai_analytics_events e2
            WHERE e2.customer_id = $1
              AND e2.created_at > ai_analytics_events.created_at
              AND e2.created_at <= ai_analytics_events.created_at + INTERVAL '48 hours'
              AND e2.user_message IS NOT NULL
              AND e2.user_message != ''
              AND e2.id != ai_analytics_events.id
          ) as got_reply
        FROM ai_analytics_events
        WHERE customer_id = $1
          AND ai_response IS NOT NULL
          AND ai_response != ''
          AND created_at >= $2
          AND created_at <= $3
      )
      SELECT 
        COUNT(*) as total_ai_responses,
        COUNT(CASE WHEN got_reply THEN 1 END) as responses_with_replies,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(CASE WHEN got_reply THEN 1 END) * 100.0 / COUNT(*)), 1)
          ELSE 0 
        END as engagement_rate
      FROM ai_responses
    `, [customerId, dateRange.start, dateRange.end]);

    // 🎯 NEW METRIC 2: Contact Capture Rate
    // Calculate % of leads where AI captured phone/email info
    const contactCaptureRate = await query(`
      WITH total_conversations AS (
        SELECT COUNT(DISTINCT 
          COALESCE(user_message, ai_response, channel || '-' || DATE(created_at)::text)
        ) as total_leads
        FROM ai_analytics_events
        WHERE customer_id = $1
          AND created_at >= $2
          AND created_at <= $3
      ),
      captured_contacts AS (
        SELECT COUNT(DISTINCT 
          COALESCE(user_message, ai_response, channel || '-' || DATE(created_at)::text)
        ) as leads_with_contact
        FROM ai_analytics_events
        WHERE customer_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND (
            event_type = 'phone_request' 
            OR event_type = 'email_request'
            OR user_message ~* '\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}'  -- Phone number pattern
            OR user_message ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'  -- Email pattern
            OR ai_response ~* 'phone|email|contact|number'
          )
      )
      SELECT 
        (SELECT total_leads FROM total_conversations) as total_leads,
        (SELECT leads_with_contact FROM captured_contacts) as captured_leads,
        CASE 
          WHEN (SELECT total_leads FROM total_conversations) > 0 
          THEN ROUND((SELECT leads_with_contact FROM captured_contacts) * 100.0 / (SELECT total_leads FROM total_conversations), 1)
          ELSE 0 
        END as capture_rate
    `, [customerId, dateRange.start, dateRange.end]);

    // 🎯 NEW METRIC 3: Average Response Speed
    // Calculate how fast AI responds to customer inquiries
    const responseSpeed = await query(`
      WITH message_pairs AS (
        SELECT 
          e1.created_at as customer_message_time,
          e2.created_at as ai_response_time,
          EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))/60 as response_minutes
        FROM ai_analytics_events e1
        JOIN ai_analytics_events e2 ON e1.customer_id = e2.customer_id
        WHERE e1.customer_id = $1
          AND e1.user_message IS NOT NULL
          AND e1.user_message != ''
          AND e2.ai_response IS NOT NULL  
          AND e2.ai_response != ''
          AND e2.created_at > e1.created_at
          AND e2.created_at <= e1.created_at + INTERVAL '2 hours'  -- Reasonable response window
          AND e1.created_at >= $2
          AND e1.created_at <= $3
          AND EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))/60 > 0  -- Positive time difference
          AND EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))/60 < 120  -- Less than 2 hours
      )
      SELECT 
        COUNT(*) as total_responses,
        ROUND(AVG(response_minutes), 1) as avg_response_minutes,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes), 1) as median_response_minutes
      FROM message_pairs
    `, [customerId, dateRange.start, dateRange.end]);

    // 🎯 NEW METRIC 4: Total Leads Captured
    // Count total unique leads/conversations
    const totalLeads = await query(`
      SELECT 
        COUNT(DISTINCT 
          COALESCE(user_message, channel || '-' || DATE(created_at)::text)
        ) as total_leads,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        COUNT(*) as total_interactions
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 📊 Keep existing behavior tracking for other analytics
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
    
    // Calculate business value (estimated)
    const businessValue = calculateBusinessValue(behaviorCounts.rows);
    
    // Calculate effectiveness score based on new metrics
    const effectivenessScore = calculateEffectivenessScore(
      engagementRate.rows[0],
      contactCaptureRate.rows[0], 
      responseSpeed.rows[0],
      totalLeads.rows[0]
    );
    
    // Generate insights based on new metrics
    const insights = generateInsights(
      engagementRate.rows[0],
      contactCaptureRate.rows[0], 
      responseSpeed.rows[0],
      totalLeads.rows[0],
      behaviorCounts.rows
    );
    
    // Format the comprehensive analytics response with NEW METRICS
    const analytics = {
      // Core metrics
      period: period,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      
      // 🎯 NEW OVERVIEW SECTION with Better Metrics
      overview: {
        effectiveness_score: effectivenessScore,
        total_interactions_month: parseInt(summaryStats.rows[0]?.total_events || 0),
        interactions_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.total_events || 0,
        hot_leads_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.hot_leads || 0,
        hot_leads_month: behaviorCounts.rows.find(b => b.event_type === 'hot_lead')?.count || 0,
        phone_requests_today: dailyTrend.rows.find(d => d.date === new Date().toISOString().slice(0, 10))?.phone_requests || 0,
        phone_requests_month: behaviorCounts.rows.find(b => b.event_type === 'phone_request')?.count || 0,
        appointments_month: behaviorCounts.rows.find(b => b.event_type === 'appointment_scheduled')?.count || 0,
        
        // 🎯 NEW METRICS that actually make sense for your business
        ai_engagement_rate: parseFloat(engagementRate.rows[0]?.engagement_rate || 0),
        contact_capture_rate: parseFloat(contactCaptureRate.rows[0]?.capture_rate || 0),
        avg_response_speed_minutes: parseFloat(responseSpeed.rows[0]?.avg_response_minutes || 0),
        total_leads_captured: parseInt(totalLeads.rows[0]?.total_leads || 0)
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
      
      // 🎯 REPLACED: Better metrics instead of broken conversion rates
      newMetrics: {
        ai_engagement: {
          rate: parseFloat(engagementRate.rows[0]?.engagement_rate || 0),
          total_responses: parseInt(engagementRate.rows[0]?.total_ai_responses || 0),
          responses_with_replies: parseInt(engagementRate.rows[0]?.responses_with_replies || 0),
          description: "% of AI responses that get customer replies"
        },
        contact_capture: {
          rate: parseFloat(contactCaptureRate.rows[0]?.capture_rate || 0),
          total_leads: parseInt(contactCaptureRate.rows[0]?.total_leads || 0),
          captured_leads: parseInt(contactCaptureRate.rows[0]?.captured_leads || 0),
          description: "% of leads where AI captured contact info"
        },
        response_speed: {
          avg_minutes: parseFloat(responseSpeed.rows[0]?.avg_response_minutes || 0),
          median_minutes: parseFloat(responseSpeed.rows[0]?.median_response_minutes || 0),
          total_measured: parseInt(responseSpeed.rows[0]?.total_responses || 0),
          description: "Average time for AI to respond to inquiries"
        },
        total_leads: {
          count: parseInt(totalLeads.rows[0]?.total_leads || 0),
          interactions: parseInt(totalLeads.rows[0]?.total_interactions || 0),
          active_days: parseInt(totalLeads.rows[0]?.active_days || 0),
          description: "Total unique leads captured"
        }
      },
      
      // Activity patterns
      activity: {
        hourly: [], // Could be implemented later
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
 * 🎯 NEW: Calculate AI effectiveness score based on better metrics
 */
function calculateEffectivenessScore(engagement, capture, speed, leads) {
  // If no data, return 0
  if (!leads?.total_leads || leads.total_leads === 0) return 0;
  
  const engagementRate = parseFloat(engagement?.engagement_rate || 0);
  const captureRate = parseFloat(capture?.capture_rate || 0);
  const avgSpeed = parseFloat(speed?.avg_response_minutes || 0);
  const totalLeads = parseInt(leads?.total_leads || 0);
  
  // Score components (0-100)
  let score = 0;
  
  // 1. Engagement Rate (40% of score)
  // 60%+ engagement is excellent, scale from there
  score += Math.min(40, (engagementRate / 60) * 40);
  
  // 2. Contact Capture Rate (35% of score)  
  // 80%+ capture is excellent, scale from there
  score += Math.min(35, (captureRate / 80) * 35);
  
  // 3. Response Speed (15% of score)
  // Under 5 minutes is excellent, over 30 minutes is poor
  if (avgSpeed > 0) {
    const speedScore = Math.max(0, Math.min(15, 15 - ((avgSpeed - 5) / 25) * 15));
    score += speedScore;
  }
  
  // 4. Volume Bonus (10% of score)
  // More leads = better performance
  if (totalLeads >= 100) score += 10;
  else if (totalLeads >= 50) score += 7;
  else if (totalLeads >= 20) score += 5;
  else if (totalLeads >= 10) score += 3;
  else if (totalLeads >= 5) score += 1;
  
  return Math.round(Math.min(100, score));
}

/**
 * 🎯 NEW: Generate insights based on better metrics
 */
function generateInsights(engagement, capture, speed, leads, behaviors) {
  const insights = [];
  
  const engagementRate = parseFloat(engagement?.engagement_rate || 0);
  const captureRate = parseFloat(capture?.capture_rate || 0);
  const avgSpeed = parseFloat(speed?.avg_response_minutes || 0);
  const totalLeads = parseInt(leads?.total_leads || 0);
  
  // No data insights
  if (totalLeads === 0) {
    insights.push({
      type: 'info',
      message: 'Your AI hasn\'t processed any leads yet. Make sure your channels are connected and active.',
      importance: 'high'
    });
    return insights;
  }
  
  // Engagement insights
  if (engagementRate >= 60) {
    insights.push({
      type: 'success',
      message: `Excellent engagement! ${engagementRate}% of your AI responses get customer replies.`,
      importance: 'high'
    });
  } else if (engagementRate >= 40) {
    insights.push({
      type: 'info',
      message: `Good engagement rate of ${engagementRate}%. Consider optimizing AI responses for better interaction.`,
      importance: 'medium'
    });
  } else if (engagementRate > 0) {
    insights.push({
      type: 'warning',
      message: `Low engagement rate (${engagementRate}%). Your AI responses may need improvement to encourage replies.`,
      importance: 'high'
    });
  }
  
  // Contact capture insights
  if (captureRate >= 80) {
    insights.push({
      type: 'success',
      message: `Outstanding contact capture! You're getting contact info from ${captureRate}% of leads.`,
      importance: 'high'
    });
  } else if (captureRate >= 50) {
    insights.push({
      type: 'info',
      message: `Decent contact capture rate of ${captureRate}%. Consider optimizing for more phone/email collection.`,
      importance: 'medium'
    });
  } else if (captureRate > 0) {
    insights.push({
      type: 'warning',
      message: `Contact capture needs work (${captureRate}%). Train your AI to better request phone numbers and emails.`,
      importance: 'high'
    });
  }
  
  // Response speed insights
  if (avgSpeed > 0 && avgSpeed <= 5) {
    insights.push({
      type: 'success',
      message: `Lightning fast responses! Average ${avgSpeed.toFixed(1)} minutes response time.`,
      importance: 'medium'
    });
  } else if (avgSpeed > 5 && avgSpeed <= 15) {
    insights.push({
      type: 'info',
      message: `Good response time of ${avgSpeed.toFixed(1)} minutes on average.`,
      importance: 'low'
    });
  } else if (avgSpeed > 15) {
    insights.push({
      type: 'warning',
      message: `Response time could be faster (${avgSpeed.toFixed(1)} min avg). Consider automation improvements.`,
      importance: 'medium'
    });
  }
  
  // Volume insights
  if (totalLeads >= 100) {
    insights.push({
      type: 'success',
      message: `High volume success with ${totalLeads} leads captured this period!`,
      importance: 'high'
    });
  } else if (totalLeads >= 50) {
    insights.push({
      type: 'success',
      message: `Good lead volume with ${totalLeads} leads captured.`,
      importance: 'medium'
    });
  } else if (totalLeads >= 10) {
    insights.push({
      type: 'info',
      message: `Building momentum with ${totalLeads} leads. Focus on scaling your channels.`,
      importance: 'medium'
    });
  }
  
  return insights;
}

// Keep existing helper functions
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

function calculateBusinessValue(behaviors) {
  let totalValue = 0;
  const valueBreakdown = {};
  
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
    note: 'Estimated value based on typical automation ROI'
  };
}

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
      appointments_month: 0,
      ai_engagement_rate: 0,
      contact_capture_rate: 0,
      avg_response_speed_minutes: 0,
      total_leads_captured: 0
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
    newMetrics: {
      ai_engagement: { rate: 0, total_responses: 0, responses_with_replies: 0 },
      contact_capture: { rate: 0, total_leads: 0, captured_leads: 0 },
      response_speed: { avg_minutes: 0, median_minutes: 0, total_measured: 0 },
      total_leads: { count: 0, interactions: 0, active_days: 0 }
    },
    activity: { hourly: [], weekly: [] },
    hotLeads: { total: 0, list: [] },
    businessValue: { total: 0, breakdown: {}, currency: 'USD', note: 'No data available' },
    dailyTrend: [],
    insights: []
  };
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
