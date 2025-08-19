// lib/analytics-service.js
// CENTRALIZED ANALYTICS SERVICE - All your analytics logic in ONE place!
// This follows the same pattern as your existing lib/ai-service.js

import { query, getCustomerByClerkId } from './database.js';

/**
 * 🎯 MAIN ANALYTICS FUNCTION - Call this from your API routes
 * Returns unified analytics for any channel or all channels
 */
export async function getAnalytics({ 
  clerkUserId, 
  customerId = null,
  channel = 'all', 
  period = 'month' 
}) {
  console.log('📊 [ANALYTICS-SERVICE] Fetching analytics:', { channel, period });
  
  try {
    // Get customer if not provided
    let customer = null;
    if (!customerId && clerkUserId) {
      const customerResult = await query(
        'SELECT * FROM customers WHERE clerk_user_id = $1 LIMIT 1',
        [clerkUserId]
      );
      
      if (!customerResult.rows[0]) {
        console.log('❌ Customer not found');
        return {
          success: false,
          error: 'Customer not found',
          analytics: getEmptyAnalytics()
        };
      }
      
      customer = customerResult.rows[0];
      customerId = customer.id;
    }
    
    // Calculate date range
    const dateRange = getDateRange(period);
    
    // Get metrics based on channel
    const universalMetrics = await getUniversalMetrics(customerId, channel, dateRange);
    const channelSpecificMetrics = await getChannelSpecificMetrics(customerId, channel, dateRange);
    const crossChannelData = channel === 'all' ? await getCrossChannelComparison(customerId, dateRange) : null;
    
    // Calculate effectiveness score
    const effectivenessScore = calculateEffectivenessScore(universalMetrics);
    
    // Generate insights
    const insights = generateInsights(universalMetrics, channelSpecificMetrics, channel);
    
    // Get behavior counts
    const behaviors = await getBehaviorCounts(customerId, channel, dateRange);
    
    // Get daily trend
    const dailyTrend = await getDailyTrend(customerId, channel, dateRange);
    
    // Calculate business value
    const businessValue = calculateBusinessValue(behaviors);
    
    // Format the response (backward compatible with your existing dashboard)
    const analytics = {
      period: period,
      dateRange: dateRange,
      
      // Keep your existing overview structure for backward compatibility
      overview: {
        effectiveness_score: effectivenessScore,
        total_interactions_month: universalMetrics.total_interactions || 0,
        interactions_today: universalMetrics.interactions_today || 0,
        hot_leads_today: universalMetrics.hot_leads_today || 0,
        hot_leads_month: universalMetrics.hot_leads_total || 0,
        phone_requests_today: universalMetrics.phone_requests_today || 0,
        phone_requests_month: universalMetrics.phone_requests_total || 0,
        appointments_month: universalMetrics.appointments_total || 0,
        
        // NEW metrics
        ai_engagement_rate: universalMetrics.ai_engagement_rate || 0,
        contact_capture_rate: universalMetrics.contact_capture_rate || 0,
        avg_response_speed_minutes: universalMetrics.avg_response_time_ms ? 
          Math.round(universalMetrics.avg_response_time_ms / 60000) : 0,
        total_leads_captured: universalMetrics.total_leads || 0
      },
      
      // Channel breakdown
      channels: crossChannelData?.channels || [],
      
      // Behaviors and insights
      behaviors: behaviors,
      topBehaviors: behaviors.slice(0, 5),
      insights: insights,
      
      // Business value
      businessValue: businessValue,
      
      // Trend data
      dailyTrend: dailyTrend,
      
      // New structure for future use
      metrics: {
        universal: universalMetrics,
        channelSpecific: channelSpecificMetrics,
        crossChannel: crossChannelData
      }
    };
    
    return {
      success: true,
      customer: customer,
      analytics: analytics,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [ANALYTICS-SERVICE] Error:', error);
    return {
      success: false,
      error: error.message,
      analytics: getEmptyAnalytics()
    };
  }
}

/**
 * 🎯 Get metrics that apply to ALL channels
 */
async function getUniversalMetrics(customerId, channel, dateRange) {
  const channelFilter = channel !== 'all' ? 'AND channel = $4' : '';
  const params = channel !== 'all' 
    ? [customerId, dateRange.start, dateRange.end, channel]
    : [customerId, dateRange.start, dateRange.end];
  
  // AI Engagement Rate
  const engagementResult = await query(`
    WITH ai_responses AS (
      SELECT 
        id, created_at, user_message, ai_response,
        EXISTS(
          SELECT 1 FROM ai_analytics_events e2
          WHERE e2.customer_id = $1
            AND e2.created_at > ai_analytics_events.created_at
            AND e2.created_at <= ai_analytics_events.created_at + INTERVAL '48 hours'
            AND e2.user_message IS NOT NULL
            AND e2.user_message != ''
            AND e2.id != ai_analytics_events.id
            ${channelFilter}
        ) as got_reply
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND ai_response IS NOT NULL
        AND ai_response != ''
        AND created_at >= $2
        AND created_at <= $3
        ${channelFilter}
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
  `, params);
  
  // Contact Capture Rate
  const captureResult = await query(`
    WITH total_conversations AS (
      SELECT COUNT(DISTINCT 
        COALESCE(user_message, ai_response, channel || '-' || DATE(created_at)::text)
      ) as total_leads
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
        ${channelFilter}
    ),
    captured_contacts AS (
      SELECT COUNT(DISTINCT 
        COALESCE(user_message, ai_response, channel || '-' || DATE(created_at)::text)
      ) as leads_with_contact
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3
        ${channelFilter}
        AND (
          event_type = 'phone_request' 
          OR event_type = 'email_request'
          OR user_message ~* '\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}'
          OR user_message ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
        )
    )
    SELECT 
      (SELECT total_leads FROM total_conversations) as total_leads,
      (SELECT leads_with_contact FROM captured_contacts) as captured_leads,
      CASE 
        WHEN (SELECT total_leads FROM total_conversations) > 0 
        THEN ROUND((SELECT leads_with_contact FROM captured_contacts) * 100.0 / 
                   (SELECT total_leads FROM total_conversations), 1)
        ELSE 0 
      END as capture_rate
  `, params);
  
  // Response Speed
  const speedResult = await query(`
    WITH message_pairs AS (
      SELECT 
        EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))/60 as response_minutes
      FROM ai_analytics_events e1
      JOIN ai_analytics_events e2 ON e1.customer_id = e2.customer_id
      WHERE e1.customer_id = $1
        AND e1.user_message IS NOT NULL
        AND e2.ai_response IS NOT NULL
        AND e2.created_at > e1.created_at
        AND e2.created_at <= e1.created_at + INTERVAL '2 hours'
        AND e1.created_at >= $2
        AND e1.created_at <= $3
        ${channelFilter.replace('channel', 'e1.channel')}
    )
    SELECT 
      COUNT(*) as total_responses,
      ROUND(AVG(response_minutes), 1) as avg_response_minutes,
      ROUND(MIN(response_minutes), 1) as min_response_minutes,
      ROUND(MAX(response_minutes), 1) as max_response_minutes
    FROM message_pairs
    WHERE response_minutes > 0 AND response_minutes < 120
  `, params);
  
  // Daily metrics
  const todayResult = await query(`
    SELECT 
      COUNT(*) as interactions_today,
      COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_leads_today,
      COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_requests_today
    FROM ai_analytics_events
    WHERE customer_id = $1
      AND DATE(created_at) = CURRENT_DATE
      ${channelFilter.replace('$4', '$2')}
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Total counts
  const totalsResult = await query(`
    SELECT 
      COUNT(*) as total_interactions,
      COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_leads_total,
      COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_requests_total,
      COUNT(CASE WHEN event_type = 'appointment_scheduled' THEN 1 END) as appointments_total,
      COUNT(DISTINCT channel) as active_channels
    FROM ai_analytics_events
    WHERE customer_id = $1
      AND created_at >= $2
      AND created_at <= $3
      ${channelFilter}
  `, params);
  
  return {
    // Engagement metrics
    ai_engagement_rate: parseFloat(engagementResult.rows[0]?.engagement_rate || 0),
    total_ai_responses: parseInt(engagementResult.rows[0]?.total_ai_responses || 0),
    responses_with_replies: parseInt(engagementResult.rows[0]?.responses_with_replies || 0),
    
    // Capture metrics
    contact_capture_rate: parseFloat(captureResult.rows[0]?.capture_rate || 0),
    total_leads: parseInt(captureResult.rows[0]?.total_leads || 0),
    captured_leads: parseInt(captureResult.rows[0]?.captured_leads || 0),
    
    // Speed metrics
    avg_response_time_ms: parseFloat(speedResult.rows[0]?.avg_response_minutes || 0) * 60000,
    min_response_time_ms: parseFloat(speedResult.rows[0]?.min_response_minutes || 0) * 60000,
    max_response_time_ms: parseFloat(speedResult.rows[0]?.max_response_minutes || 0) * 60000,
    
    // Daily metrics
    interactions_today: parseInt(todayResult.rows[0]?.interactions_today || 0),
    hot_leads_today: parseInt(todayResult.rows[0]?.hot_leads_today || 0),
    phone_requests_today: parseInt(todayResult.rows[0]?.phone_requests_today || 0),
    
    // Total metrics
    total_interactions: parseInt(totalsResult.rows[0]?.total_interactions || 0),
    hot_leads_total: parseInt(totalsResult.rows[0]?.hot_leads_total || 0),
    phone_requests_total: parseInt(totalsResult.rows[0]?.phone_requests_total || 0),
    appointments_total: parseInt(totalsResult.rows[0]?.appointments_total || 0),
    active_channels: parseInt(totalsResult.rows[0]?.active_channels || 0)
  };
}

/**
 * 🎯 Get metrics specific to each channel
 */
async function getChannelSpecificMetrics(customerId, channel, dateRange) {
  const metrics = {};
  
  if (channel === 'email' || channel === 'all') {
    const emailResult = await query(`
      SELECT 
        COUNT(DISTINCT thread_id) as total_threads,
        COUNT(*) as total_messages,
        AVG(CASE WHEN metadata->>'opened' = 'true' THEN 1 ELSE 0 END) * 100 as open_rate,
        AVG(CASE WHEN metadata->>'clicked' = 'true' THEN 1 ELSE 0 END) * 100 as click_rate
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND channel = 'email'
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    metrics.email = {
      total_threads: parseInt(emailResult.rows[0]?.total_threads || 0),
      total_messages: parseInt(emailResult.rows[0]?.total_messages || 0),
      open_rate: parseFloat(emailResult.rows[0]?.open_rate || 0),
      click_rate: parseFloat(emailResult.rows[0]?.click_rate || 0)
    };
  }
  
  if (channel === 'sms' || channel === 'all') {
    const smsResult = await query(`
      SELECT 
        COUNT(DISTINCT metadata->>'phone_number') as unique_numbers,
        COUNT(*) as total_messages,
        AVG(CASE WHEN metadata->>'delivered' = 'true' THEN 1 ELSE 0 END) * 100 as delivery_rate
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND channel = 'sms'
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    metrics.sms = {
      unique_numbers: parseInt(smsResult.rows[0]?.unique_numbers || 0),
      total_messages: parseInt(smsResult.rows[0]?.total_messages || 0),
      delivery_rate: parseFloat(smsResult.rows[0]?.delivery_rate || 0)
    };
  }
  
  if (channel === 'chat' || channel === 'all') {
    const chatResult = await query(`
      SELECT 
        COUNT(DISTINCT metadata->>'session_id') as total_sessions,
        AVG(CAST(metadata->>'duration_seconds' AS FLOAT)) as avg_session_duration,
        COUNT(CASE WHEN event_type = 'chat_converted' THEN 1 END) as conversions
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND channel = 'chat'
        AND created_at >= $2
        AND created_at <= $3
    `, [customerId, dateRange.start, dateRange.end]);
    
    metrics.chat = {
      total_sessions: parseInt(chatResult.rows[0]?.total_sessions || 0),
      avg_session_duration: parseFloat(chatResult.rows[0]?.avg_session_duration || 0),
      conversions: parseInt(chatResult.rows[0]?.conversions || 0)
    };
  }
  
  return metrics;
}

/**
 * 🎯 Compare performance across channels
 */
async function getCrossChannelComparison(customerId, dateRange) {
  const result = await query(`
    SELECT 
      channel,
      COUNT(*) as total_interactions,
      COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_leads,
      COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_requests,
      COUNT(CASE WHEN event_type = 'appointment_scheduled' THEN 1 END) as appointments,
      ROUND(AVG(confidence_score) * 100, 1) as avg_confidence
    FROM ai_analytics_events
    WHERE customer_id = $1
      AND created_at >= $2
      AND created_at <= $3
      AND channel IS NOT NULL
    GROUP BY channel
    ORDER BY total_interactions DESC
  `, [customerId, dateRange.start, dateRange.end]);
  
  return {
    channels: result.rows.map(row => ({
      name: row.channel,
      total_interactions: parseInt(row.total_interactions),
      hot_leads: parseInt(row.hot_leads),
      phone_requests: parseInt(row.phone_requests),
      appointments: parseInt(row.appointments),
      avg_confidence: parseFloat(row.avg_confidence),
      effectiveness: calculateChannelEffectiveness(row)
    }))
  };
}

/**
 * 🎯 Get behavior counts
 */
async function getBehaviorCounts(customerId, channel, dateRange) {
  const channelFilter = channel !== 'all' ? 'AND channel = $4' : '';
  const params = channel !== 'all' 
    ? [customerId, dateRange.start, dateRange.end, channel]
    : [customerId, dateRange.start, dateRange.end];
  
  const result = await query(`
    SELECT 
      event_type,
      COUNT(*) as count
    FROM ai_analytics_events
    WHERE customer_id = $1
      AND created_at >= $2
      AND created_at <= $3
      AND event_type IS NOT NULL
      ${channelFilter}
    GROUP BY event_type
    ORDER BY count DESC
  `, params);
  
  return result.rows.map(row => ({
    event_type: row.event_type,
    count: parseInt(row.count),
    label: formatEventTypeLabel(row.event_type)
  }));
}

/**
 * 🎯 Get daily trend data
 */
async function getDailyTrend(customerId, channel, dateRange) {
  const channelFilter = channel !== 'all' ? 'AND channel = $4' : '';
  const params = channel !== 'all' 
    ? [customerId, dateRange.start, dateRange.end, channel]
    : [customerId, dateRange.start, dateRange.end];
  
  const result = await query(`
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
      ${channelFilter}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `, params);
  
  return result.rows.map(row => ({
    date: row.date,
    metrics: {
      total: parseInt(row.total_events),
      phoneRequests: parseInt(row.phone_requests),
      appointments: parseInt(row.appointments),
      hotLeads: parseInt(row.hot_leads)
    }
  }));
}

/**
 * 🎯 Calculate effectiveness score
 */
function calculateEffectivenessScore(metrics) {
  let score = 0;
  
  // Engagement (40% of score)
  if (metrics.ai_engagement_rate >= 60) score += 40;
  else if (metrics.ai_engagement_rate >= 40) score += 25;
  else if (metrics.ai_engagement_rate >= 20) score += 15;
  else if (metrics.ai_engagement_rate > 0) score += 5;
  
  // Contact capture (35% of score)
  if (metrics.contact_capture_rate >= 80) score += 35;
  else if (metrics.contact_capture_rate >= 60) score += 25;
  else if (metrics.contact_capture_rate >= 40) score += 15;
  else if (metrics.contact_capture_rate > 0) score += 5;
  
  // Response speed (15% of score)
  const avgMinutes = metrics.avg_response_time_ms / 60000;
  if (avgMinutes <= 5) score += 15;
  else if (avgMinutes <= 10) score += 10;
  else if (avgMinutes <= 20) score += 5;
  
  // Volume bonus (10% of score)
  if (metrics.total_interactions >= 1000) score += 10;
  else if (metrics.total_interactions >= 500) score += 7;
  else if (metrics.total_interactions >= 100) score += 5;
  else if (metrics.total_interactions >= 50) score += 3;
  
  return Math.min(100, Math.round(score));
}

/**
 * 🎯 Generate AI insights
 */
function generateInsights(universalMetrics, channelMetrics, channel) {
  const insights = [];
  
  // Engagement insights
  if (universalMetrics.ai_engagement_rate >= 60) {
    insights.push({
      type: 'success',
      message: `Excellent! ${universalMetrics.ai_engagement_rate}% of AI responses get customer replies`,
      importance: 'high'
    });
  } else if (universalMetrics.ai_engagement_rate < 30 && universalMetrics.total_ai_responses > 10) {
    insights.push({
      type: 'warning',
      message: `Low engagement rate (${universalMetrics.ai_engagement_rate}%). Consider improving AI responses`,
      importance: 'high'
    });
  }
  
  // Contact capture insights
  if (universalMetrics.contact_capture_rate >= 80) {
    insights.push({
      type: 'success',
      message: `Outstanding! Capturing contact info from ${universalMetrics.contact_capture_rate}% of leads`,
      importance: 'high'
    });
  } else if (universalMetrics.contact_capture_rate < 50 && universalMetrics.total_leads > 10) {
    insights.push({
      type: 'warning',
      message: `Only capturing ${universalMetrics.contact_capture_rate}% of contact info. Train AI to request phone/email`,
      importance: 'high'
    });
  }
  
  // Speed insights
  const avgMinutes = universalMetrics.avg_response_time_ms / 60000;
  if (avgMinutes <= 5 && avgMinutes > 0) {
    insights.push({
      type: 'success',
      message: `Lightning fast! Average response time is ${avgMinutes.toFixed(1)} minutes`,
      importance: 'medium'
    });
  } else if (avgMinutes > 30) {
    insights.push({
      type: 'warning',
      message: `Slow responses (${avgMinutes.toFixed(1)} min avg). Consider automation improvements`,
      importance: 'high'
    });
  }
  
  // Hot leads insights
  if (universalMetrics.hot_leads_today >= 5) {
    insights.push({
      type: 'success',
      message: `🔥 ${universalMetrics.hot_leads_today} hot leads identified today!`,
      importance: 'high'
    });
  }
  
  // Channel-specific insights
  if (channel === 'email' && channelMetrics.email) {
    if (channelMetrics.email.open_rate >= 30) {
      insights.push({
        type: 'success',
        message: `Email open rate is strong at ${channelMetrics.email.open_rate.toFixed(1)}%`,
        importance: 'medium'
      });
    }
  }
  
  return insights;
}

/**
 * 🎯 Calculate business value
 */
function calculateBusinessValue(behaviors) {
  const valueMap = {
    'hot_lead': 200,
    'appointment_scheduled': 150,
    'phone_request': 75,
    'email_request': 50,
    'pricing_discussed': 100,
    'demo_requested': 125,
    'follow_up': 25,
    'qualifying_questions': 30,
    'urgency_created': 40,
    'advantages_highlighted': 20
  };
  
  let totalValue = 0;
  const breakdown = {};
  
  behaviors.forEach(behavior => {
    const value = valueMap[behavior.event_type] || 10;
    const behaviorValue = value * behavior.count;
    totalValue += behaviorValue;
    
    if (valueMap[behavior.event_type]) {
      breakdown[behavior.event_type] = behaviorValue;
    }
  });
  
  return {
    total: totalValue,
    breakdown: breakdown,
    currency: 'USD',
    note: 'Estimated value based on typical B2B automation ROI'
  };
}

/**
 * 🎯 Helper functions
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

function calculateChannelEffectiveness(channelData) {
  const total = parseInt(channelData.total_interactions) || 0;
  if (total === 0) return 0;
  
  const hotLeads = parseInt(channelData.hot_leads) || 0;
  const phoneRequests = parseInt(channelData.phone_requests) || 0;
  const appointments = parseInt(channelData.appointments) || 0;
  
  const score = ((hotLeads * 3) + (appointments * 2) + phoneRequests) / total * 100;
  return Math.min(100, Math.round(score));
}

function formatEventTypeLabel(eventType) {
  const labels = {
    'hot_lead': '🔥 Hot Lead',
    'phone_request': '📞 Phone Request',
    'email_request': '✉️ Email Request',
    'appointment_scheduled': '📅 Appointment',
    'pricing_discussed': '💰 Pricing Discussion',
    'demo_requested': '🖥️ Demo Request',
    'follow_up': '🔄 Follow-up',
    'qualifying_questions': '❓ Qualifying Questions',
    'urgency_created': '⚡ Urgency Created',
    'advantages_highlighted': '✨ Advantages Highlighted'
  };
  
  return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    channels: [],
    behaviors: [],
    topBehaviors: [],
    insights: [],
    businessValue: { total: 0, breakdown: {} },
    dailyTrend: [],
    metrics: {
      universal: {},
      channelSpecific: {},
      crossChannel: null
    }
  };
}

/**
 * 🎯 SPECIALIZED FUNCTIONS FOR SPECIFIC CHANNELS
 */

// Email-specific analytics
export async function getEmailAnalytics(clerkUserId) {
  return getAnalytics({ clerkUserId, channel: 'email', period: 'month' });
}

// SMS-specific analytics
export async function getSMSAnalytics(clerkUserId) {
  return getAnalytics({ clerkUserId, channel: 'sms', period: 'month' });
}

// Chat-specific analytics
export async function getChatAnalytics(clerkUserId) {
  return getAnalytics({ clerkUserId, channel: 'chat', period: 'month' });
}

// Social media analytics
export async function getSocialAnalytics(clerkUserId) {
  return getAnalytics({ clerkUserId, channel: 'social', period: 'month' });
}

/**
 * 🎯 ADMIN ANALYTICS (for your admin dashboard)
 */
export async function getAdminAnalytics(period = 'month') {
  try {
    const dateRange = getDateRange(period);
    
    // Get aggregate metrics across all customers
    const result = await query(`
      SELECT 
        COUNT(DISTINCT customer_id) as active_customers,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as total_hot_leads,
        AVG(confidence_score) as avg_confidence,
        COUNT(DISTINCT channel) as active_channels
      FROM ai_analytics_events
      WHERE created_at >= $1 AND created_at <= $2
    `, [dateRange.start, dateRange.end]);
    
    return {
      success: true,
      metrics: result.rows[0],
      period: period,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Admin analytics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export all functions
export default {
  getAnalytics,
  getEmailAnalytics,
  getSMSAnalytics,
  getChatAnalytics,
  getSocialAnalytics,
  getAdminAnalytics,
  getEmptyAnalytics
};
