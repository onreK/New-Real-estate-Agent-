// app/api/customer/analytics/route.js
// Customer analytics API - shows real AI behavior data
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get time period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, week, today, all
    
    // Get customer ID
    const customerResult = await query(`
      SELECT id, business_name, created_at
      FROM customers 
      WHERE clerk_user_id = $1 OR email = $2
      LIMIT 1
    `, [user.id, user.emailAddresses?.[0]?.emailAddress]);
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Customer not found',
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
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
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
    
    // 🔥 Get hot leads details
    const hotLeads = await query(`
      SELECT 
        event_data,
        user_message,
        ai_response,
        created_at,
        confidence_score
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND event_type = 'hot_lead_detected'
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
        COUNT(CASE WHEN event_type = 'phone_requested' THEN 1 END) as phone_requests,
        COUNT(CASE WHEN event_type = 'appointment_offered' THEN 1 END) as appointments,
        COUNT(CASE WHEN event_type = 'hot_lead_detected' THEN 1 END) as hot_leads
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [customerId, dateRange.start, dateRange.end]);
    
    // 💰 Calculate business value (estimated)
    const businessValue = calculateBusinessValue(behaviorCounts.rows);
    
    // 🎯 Get most effective behaviors
    const topBehaviors = await query(`
      SELECT 
        event_type,
        COUNT(*) as occurrences,
        AVG(confidence_score) as effectiveness
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND confidence_score > 0.7
      GROUP BY event_type
      ORDER BY occurrences DESC
      LIMIT 5
    `, [customerId, dateRange.start, dateRange.end]);
    
    // Format the analytics response
    const analytics = {
      period: period,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      summary: {
        totalAIInteractions: parseInt(summaryStats.rows[0]?.total_events || 0),
        uniqueConversations: parseInt(summaryStats.rows[0]?.unique_conversations || 0),
        activeDays: parseInt(summaryStats.rows[0]?.active_days || 0),
        channelsUsed: parseInt(summaryStats.rows[0]?.channels_used || 0)
      },
      behaviors: formatBehaviorCounts(behaviorCounts.rows),
      hotLeads: {
        total: hotLeads.rows.length,
        list: hotLeads.rows.map(lead => ({
          date: lead.created_at,
          confidence: parseFloat(lead.confidence_score),
          message: lead.user_message?.substring(0, 100) + '...',
          response: lead.ai_response?.substring(0, 100) + '...',
          data: JSON.parse(lead.event_data || '{}')
        }))
      },
      businessValue: businessValue,
      dailyTrend: dailyTrend.rows.map(day => ({
        date: day.date,
        metrics: {
          total: parseInt(day.total_events),
          phoneRequests: parseInt(day.phone_requests),
          appointments: parseInt(day.appointments),
          hotLeads: parseInt(day.hot_leads)
        }
      })),
      topBehaviors: topBehaviors.rows.map(behavior => ({
        type: formatEventType(behavior.event_type),
        count: parseInt(behavior.occurrences),
        effectiveness: parseFloat(behavior.effectiveness).toFixed(2)
      })),
      insights: generateInsights(behaviorCounts.rows, summaryStats.rows[0])
    };
    
    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        businessName: customer.business_name,
        memberSince: customer.created_at
      },
      analytics: analytics
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Format behavior counts into readable metrics
 */
function formatBehaviorCounts(behaviors) {
  const formatted = {
    phoneRequests: 0,
    appointmentsOffered: 0,
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
      case 'phone_requested':
        formatted.phoneRequests = parseInt(behavior.count);
        break;
      case 'appointment_offered':
        formatted.appointmentsOffered = parseInt(behavior.count);
        break;
      case 'hot_lead_detected':
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
      case 'email_requested':
        formatted.emailsRequested = parseInt(behavior.count);
        break;
      case 'followup_offered':
        formatted.followupsOffered = parseInt(behavior.count);
        break;
      case 'qualifying_questions_asked':
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
    'phone_requested': 50,
    'appointment_offered': 75,
    'hot_lead_detected': 200,
    'pricing_discussed': 30,
    'email_requested': 25,
    'followup_offered': 20
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
 * Generate insights from analytics data
 */
function generateInsights(behaviors, summary) {
  const insights = [];
  
  // Find the most common behavior
  if (behaviors.length > 0) {
    const topBehavior = behaviors[0];
    insights.push({
      type: 'top_behavior',
      message: `Your AI most frequently ${formatEventType(topBehavior.event_type)} (${topBehavior.count} times)`,
      importance: 'high'
    });
  }
  
  // Check for hot lead effectiveness
  const hotLeadBehavior = behaviors.find(b => b.event_type === 'hot_lead_detected');
  if (hotLeadBehavior) {
    const avgConfidence = parseFloat(hotLeadBehavior.avg_confidence);
    if (avgConfidence > 0.8) {
      insights.push({
        type: 'hot_lead_quality',
        message: `Excellent hot lead detection with ${(avgConfidence * 100).toFixed(0)}% confidence`,
        importance: 'high'
      });
    }
  }
  
  // Check for phone request performance
  const phoneRequests = behaviors.find(b => b.event_type === 'phone_requested');
  const appointments = behaviors.find(b => b.event_type === 'appointment_offered');
  
  if (phoneRequests && appointments) {
    const ratio = parseInt(appointments.count) / parseInt(phoneRequests.count);
    if (ratio > 0.5) {
      insights.push({
        type: 'conversion_optimization',
        message: `Strong conversion: ${(ratio * 100).toFixed(0)}% of phone requests lead to appointment offers`,
        importance: 'medium'
      });
    }
  }
  
  // Activity level insight
  if (summary && parseInt(summary.total_events) > 100) {
    insights.push({
      type: 'high_activity',
      message: `High engagement with ${summary.total_events} AI interactions`,
      importance: 'medium'
    });
  }
  
  return insights;
}

/**
 * Format event type for display
 */
function formatEventType(eventType) {
  const formats = {
    'phone_requested': 'requests phone numbers',
    'appointment_offered': 'offers appointments',
    'hot_lead_detected': 'detects hot leads',
    'pricing_discussed': 'discusses pricing',
    'cta_included': 'includes calls-to-action',
    'advantages_highlighted': 'highlights advantages',
    'email_requested': 'requests emails',
    'followup_offered': 'offers follow-ups',
    'qualifying_questions_asked': 'asks qualifying questions',
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
    summary: {
      totalAIInteractions: 0,
      uniqueConversations: 0,
      activeDays: 0,
      channelsUsed: 0
    },
    behaviors: {
      phoneRequests: 0,
      appointmentsOffered: 0,
      hotLeadsDetected: 0,
      pricingDiscussed: 0,
      ctaIncluded: 0,
      advantagesHighlighted: 0,
      emailsRequested: 0,
      followupsOffered: 0,
      qualifyingQuestionsAsked: 0,
      urgencyCreated: 0
    },
    hotLeads: {
      total: 0,
      list: []
    },
    businessValue: {
      total: 0,
      breakdown: {},
      currency: 'USD'
    },
    dailyTrend: [],
    topBehaviors: [],
    insights: []
  };
}
