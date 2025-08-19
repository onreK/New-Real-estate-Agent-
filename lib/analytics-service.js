// lib/analytics-service.js
// CENTRALIZED ANALYTICS - Same pattern as your AI service!

import { query } from './database.js';

/**
 * 🎯 MAIN ANALYTICS BRAIN - All channels use this
 * Just like generateAIResponse, but for analytics!
 */
export async function getAnalytics({
  channel = 'all',           // 'sms', 'email', 'chat', 'facebook', 'all'
  customerId,
  clerkUserId,
  timeframe = '30d',         // '24h', '7d', '30d', '90d', 'all'
  metrics = 'standard',      // 'standard', 'detailed', 'summary'
  includeChannelSpecific = true
}) {
  console.log(`📊 [ANALYTICS] Fetching ${channel} analytics for ${timeframe}`);
  
  try {
    // Step 1: Get customer if not provided
    const customer = await getCustomerForAnalytics(customerId, clerkUserId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Step 2: Get universal metrics (same for ALL channels)
    const universalMetrics = await getUniversalMetrics(customer.id, channel, timeframe);
    
    // Step 3: Get channel-specific metrics if needed
    let channelMetrics = {};
    if (includeChannelSpecific && channel !== 'all') {
      channelMetrics = await getChannelSpecificMetrics(channel, customer.id, timeframe);
    }
    
    // Step 4: Get cross-channel comparison if viewing all
    let crossChannelData = {};
    if (channel === 'all') {
      crossChannelData = await getCrossChannelComparison(customer.id, timeframe);
    }
    
    // Step 5: Calculate business insights
    const insights = await generateInsights(universalMetrics, channelMetrics, channel);
    
    // Step 6: Track this analytics view (for meta-analytics)
    await trackAnalyticsView(customer.id, channel, timeframe);
    
    console.log(`✅ [ANALYTICS] Successfully generated ${channel} analytics`);
    
    return {
      success: true,
      customer: {
        id: customer.id,
        business_name: customer.business_name,
        created_at: customer.created_at
      },
      timeframe: timeframe,
      channel: channel,
      metrics: {
        universal: universalMetrics,
        channelSpecific: channelMetrics,
        crossChannel: crossChannelData
      },
      insights: insights,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [ANALYTICS] Error:', error);
    return {
      success: false,
      error: error.message,
      metrics: getEmptyMetrics()
    };
  }
}

/**
 * 📊 UNIVERSAL METRICS - Same for all channels
 * These are the core KPIs that matter regardless of channel
 */
async function getUniversalMetrics(customerId, channel, timeframe) {
  const dateFilter = getDateFilter(timeframe);
  const channelFilter = channel !== 'all' ? `AND channel = $2` : '';
  
  // Total interactions
  const interactions = await query(`
    SELECT 
      COUNT(*) as total_interactions,
      COUNT(DISTINCT conversation_id) as unique_conversations,
      COUNT(DISTINCT DATE(created_at)) as active_days
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND created_at >= ${dateFilter}
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Response metrics
  const responseMetrics = await query(`
    SELECT 
      AVG(response_time_ms) as avg_response_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
      MIN(response_time_ms) as fastest_response,
      MAX(response_time_ms) as slowest_response
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND response_time_ms IS NOT NULL
      AND created_at >= ${dateFilter}
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Engagement metrics (AI responses that got replies)
  const engagement = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE got_reply = true) as responses_with_replies,
      COUNT(*) as total_ai_responses,
      ROUND(100.0 * COUNT(*) FILTER (WHERE got_reply = true) / NULLIF(COUNT(*), 0), 1) as engagement_rate
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND event_type = 'ai_response'
      AND created_at >= ${dateFilter}
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Lead capture metrics
  const leadCapture = await query(`
    SELECT 
      COUNT(DISTINCT conversation_id) as total_leads,
      COUNT(DISTINCT conversation_id) FILTER (WHERE contact_captured = true) as leads_with_contact,
      ROUND(100.0 * COUNT(DISTINCT conversation_id) FILTER (WHERE contact_captured = true) / 
        NULLIF(COUNT(DISTINCT conversation_id), 0), 1) as capture_rate
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND created_at >= ${dateFilter}
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Hot leads
  const hotLeads = await query(`
    SELECT 
      COUNT(*) as total_hot_leads,
      COUNT(DISTINCT conversation_id) as unique_hot_lead_conversations,
      DATE(created_at) as date
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND event_type = 'hot_lead'
      AND created_at >= ${dateFilter}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  // Behavior events (appointments, phone requests, etc.)
  const behaviors = await query(`
    SELECT 
      event_type,
      COUNT(*) as count
    FROM ai_analytics_events
    WHERE customer_id = $1 ${channelFilter}
      AND event_type IN ('appointment_scheduled', 'phone_request', 'demo_request', 
                        'pricing_inquiry', 'quote_request', 'contact_form')
      AND created_at >= ${dateFilter}
    GROUP BY event_type
  `, channel !== 'all' ? [customerId, channel] : [customerId]);
  
  return {
    // Core metrics
    total_interactions: parseInt(interactions.rows[0]?.total_interactions || 0),
    unique_conversations: parseInt(interactions.rows[0]?.unique_conversations || 0),
    active_days: parseInt(interactions.rows[0]?.active_days || 0),
    
    // Response performance
    avg_response_time_ms: parseFloat(responseMetrics.rows[0]?.avg_response_time || 0),
    median_response_time_ms: parseFloat(responseMetrics.rows[0]?.median_response_time || 0),
    fastest_response_ms: parseFloat(responseMetrics.rows[0]?.fastest_response || 0),
    slowest_response_ms: parseFloat(responseMetrics.rows[0]?.slowest_response || 0),
    
    // Engagement
    ai_engagement_rate: parseFloat(engagement.rows[0]?.engagement_rate || 0),
    total_ai_responses: parseInt(engagement.rows[0]?.total_ai_responses || 0),
    responses_with_replies: parseInt(engagement.rows[0]?.responses_with_replies || 0),
    
    // Lead capture
    contact_capture_rate: parseFloat(leadCapture.rows[0]?.capture_rate || 0),
    total_leads: parseInt(leadCapture.rows[0]?.total_leads || 0),
    leads_with_contact: parseInt(leadCapture.rows[0]?.leads_with_contact || 0),
    
    // Hot leads
    hot_leads_total: hotLeads.rows.reduce((sum, row) => sum + parseInt(row.total_hot_leads), 0),
    hot_leads_today: parseInt(hotLeads.rows.find(r => 
      new Date(r.date).toDateString() === new Date().toDateString()
    )?.total_hot_leads || 0),
    hot_leads_trend: hotLeads.rows.map(r => ({
      date: r.date,
      count: parseInt(r.total_hot_leads)
    })),
    
    // Business behaviors
    behaviors: behaviors.rows.reduce((acc, row) => {
      acc[row.event_type] = parseInt(row.count);
      return acc;
    }, {})
  };
}

/**
 * 📱 CHANNEL-SPECIFIC METRICS
 * Unique metrics that only make sense for specific channels
 */
async function getChannelSpecificMetrics(channel, customerId, timeframe) {
  const dateFilter = getDateFilter(timeframe);
  
  switch(channel) {
    case 'email':
    case 'gmail':
      return await getEmailSpecificMetrics(customerId, dateFilter);
    
    case 'sms':
      return await getSMSSpecificMetrics(customerId, dateFilter);
    
    case 'facebook':
    case 'instagram':
      return await getSocialSpecificMetrics(customerId, channel, dateFilter);
    
    case 'chat':
      return await getChatSpecificMetrics(customerId, dateFilter);
    
    default:
      return {};
  }
}

/**
 * 📧 Email-specific metrics
 */
async function getEmailSpecificMetrics(customerId, dateFilter) {
  // Email-only metrics from your email_conversations table
  const emailMetrics = await query(`
    SELECT 
      COUNT(*) as total_emails,
      COUNT(*) FILTER (WHERE status = 'sent') as emails_sent,
      COUNT(*) FILTER (WHERE status = 'delivered') as emails_delivered,
      COUNT(*) FILTER (WHERE status = 'opened') as emails_opened,
      COUNT(*) FILTER (WHERE status = 'replied') as emails_replied,
      COUNT(*) FILTER (WHERE status = 'bounced') as emails_bounced,
      COUNT(*) FILTER (WHERE is_spam = true) as spam_complaints
    FROM email_conversations
    WHERE customer_id = $1
      AND created_at >= ${dateFilter}
  `, [customerId]);
  
  const row = emailMetrics.rows[0] || {};
  const total = parseInt(row.total_emails) || 1; // Prevent division by zero
  
  return {
    total_emails: parseInt(row.total_emails || 0),
    delivery_rate: ((parseInt(row.emails_delivered || 0) / total) * 100).toFixed(1),
    open_rate: ((parseInt(row.emails_opened || 0) / total) * 100).toFixed(1),
    reply_rate: ((parseInt(row.emails_replied || 0) / total) * 100).toFixed(1),
    bounce_rate: ((parseInt(row.emails_bounced || 0) / total) * 100).toFixed(1),
    spam_rate: ((parseInt(row.spam_complaints || 0) / total) * 100).toFixed(1),
    
    // Email-specific features usage
    templates_used: await getTemplateUsage(customerId, dateFilter),
    auto_responses_sent: await getAutoResponseCount(customerId, dateFilter)
  };
}

/**
 * 📱 SMS-specific metrics
 */
async function getSMSSpecificMetrics(customerId, dateFilter) {
  const smsMetrics = await query(`
    SELECT 
      COUNT(*) as total_messages,
      COUNT(*) FILTER (WHERE direction = 'outbound') as messages_sent,
      COUNT(*) FILTER (WHERE direction = 'inbound') as messages_received,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(DISTINCT phone_number) as unique_contacts
    FROM sms_conversations
    WHERE customer_id = $1
      AND created_at >= ${dateFilter}
  `, [customerId]);
  
  const row = smsMetrics.rows[0] || {};
  const sent = parseInt(row.messages_sent) || 1;
  
  return {
    total_messages: parseInt(row.total_messages || 0),
    messages_sent: parseInt(row.messages_sent || 0),
    messages_received: parseInt(row.messages_received || 0),
    delivery_rate: ((parseInt(row.delivered || 0) / sent) * 100).toFixed(1),
    failure_rate: ((parseInt(row.failed || 0) / sent) * 100).toFixed(1),
    unique_contacts: parseInt(row.unique_contacts || 0),
    
    // SMS-specific
    opt_out_rate: await getOptOutRate(customerId, dateFilter),
    media_messages: await getMediaMessageCount(customerId, dateFilter)
  };
}

/**
 * 💬 Social media specific metrics
 */
async function getSocialSpecificMetrics(customerId, channel, dateFilter) {
  // Simulated for now - replace with actual social media tables when ready
  return {
    posts_responded: 0,
    comments_handled: 0,
    dms_answered: 0,
    mentions_tracked: 0,
    sentiment_score: 0,
    share_count: 0,
    reaction_count: 0,
    story_replies: channel === 'instagram' ? 0 : undefined
  };
}

/**
 * 💬 Web chat specific metrics
 */
async function getChatSpecificMetrics(customerId, dateFilter) {
  const chatMetrics = await query(`
    SELECT 
      AVG(session_duration_ms) as avg_session_duration,
      AVG(messages_per_session) as avg_messages_per_session,
      COUNT(*) FILTER (WHERE resolved = true) as resolved_chats,
      COUNT(*) as total_chats
    FROM chat_sessions
    WHERE customer_id = $1
      AND created_at >= ${dateFilter}
  `, [customerId]);
  
  const row = chatMetrics.rows[0] || {};
  
  return {
    avg_session_duration_min: (parseFloat(row.avg_session_duration || 0) / 60000).toFixed(1),
    avg_messages_per_session: parseFloat(row.avg_messages_per_session || 0).toFixed(1),
    resolution_rate: ((parseInt(row.resolved_chats || 0) / parseInt(row.total_chats || 1)) * 100).toFixed(1),
    
    // Chat-specific
    widget_impressions: await getWidgetImpressions(customerId, dateFilter),
    proactive_chats: await getProactiveChatCount(customerId, dateFilter)
  };
}

/**
 * 📊 Cross-channel comparison (for 'all' view)
 */
async function getCrossChannelComparison(customerId, timeframe) {
  const dateFilter = getDateFilter(timeframe);
  
  const comparison = await query(`
    SELECT 
      channel,
      COUNT(*) as interactions,
      AVG(response_time_ms) as avg_response_time,
      COUNT(*) FILTER (WHERE event_type = 'hot_lead') as hot_leads,
      COUNT(DISTINCT conversation_id) as conversations
    FROM ai_analytics_events
    WHERE customer_id = $1
      AND created_at >= ${dateFilter}
    GROUP BY channel
    ORDER BY interactions DESC
  `, [customerId]);
  
  return {
    channels: comparison.rows.map(row => ({
      name: row.channel,
      interactions: parseInt(row.interactions),
      conversations: parseInt(row.conversations),
      hot_leads: parseInt(row.hot_leads),
      avg_response_ms: parseFloat(row.avg_response_time || 0),
      percentage: 0 // Will be calculated client-side
    })),
    best_performing_channel: comparison.rows[0]?.channel || 'none',
    total_channels_active: comparison.rows.length
  };
}

/**
 * 💡 Generate AI-powered insights
 */
async function generateInsights(universalMetrics, channelMetrics, channel) {
  const insights = [];
  
  // Engagement insights
  if (universalMetrics.ai_engagement_rate >= 60) {
    insights.push({
      type: 'success',
      title: 'Excellent Engagement',
      message: `${universalMetrics.ai_engagement_rate}% of AI responses get customer replies`,
      metric: 'engagement',
      importance: 'high'
    });
  } else if (universalMetrics.ai_engagement_rate < 30) {
    insights.push({
      type: 'warning',
      title: 'Low Engagement',
      message: 'Consider improving AI response quality to encourage more replies',
      metric: 'engagement',
      importance: 'high'
    });
  }
  
  // Response speed insights
  const avgResponseSec = universalMetrics.avg_response_time_ms / 1000;
  if (avgResponseSec < 5) {
    insights.push({
      type: 'success',
      title: 'Lightning Fast Responses',
      message: `Average response time is ${avgResponseSec.toFixed(1)} seconds`,
      metric: 'speed',
      importance: 'medium'
    });
  }
  
  // Contact capture insights
  if (universalMetrics.contact_capture_rate >= 80) {
    insights.push({
      type: 'success',
      title: 'Great Contact Capture',
      message: `Capturing contact info from ${universalMetrics.contact_capture_rate}% of leads`,
      metric: 'capture',
      importance: 'high'
    });
  }
  
  // Hot leads insight
  if (universalMetrics.hot_leads_today > 0) {
    insights.push({
      type: 'alert',
      title: `${universalMetrics.hot_leads_today} Hot Leads Today`,
      message: 'These leads need immediate attention',
      metric: 'hot_leads',
      importance: 'urgent',
      action: 'View Hot Leads'
    });
  }
  
  // Channel-specific insights
  if (channel === 'email' && channelMetrics.open_rate) {
    if (parseFloat(channelMetrics.open_rate) < 20) {
      insights.push({
        type: 'warning',
        title: 'Low Email Open Rate',
        message: 'Consider improving subject lines or sender reputation',
        metric: 'email_opens',
        importance: 'medium'
      });
    }
  }
  
  if (channel === 'sms' && channelMetrics.opt_out_rate > 5) {
    insights.push({
      type: 'warning',
      title: 'High SMS Opt-Out Rate',
      message: 'Review message frequency and content',
      metric: 'sms_optout',
      importance: 'high'
    });
  }
  
  return insights;
}

/**
 * 🛠️ UTILITY FUNCTIONS
 */

function getDateFilter(timeframe) {
  const now = new Date();
  switch(timeframe) {
    case '24h':
      return `NOW() - INTERVAL '24 hours'`;
    case '7d':
      return `NOW() - INTERVAL '7 days'`;
    case '30d':
      return `NOW() - INTERVAL '30 days'`;
    case '90d':
      return `NOW() - INTERVAL '90 days'`;
    case 'all':
    default:
      return `'2020-01-01'`; // Or your launch date
  }
}

async function getCustomerForAnalytics(customerId, clerkUserId) {
  if (customerId) {
    const result = await query('SELECT * FROM customers WHERE id = $1', [customerId]);
    return result.rows[0];
  }
  
  if (clerkUserId) {
    const { getCustomerByClerkId } = await import('./database.js');
    return await getCustomerByClerkId(clerkUserId);
  }
  
  return null;
}

async function trackAnalyticsView(customerId, channel, timeframe) {
  // Track that customer viewed analytics (for usage tracking)
  try {
    await query(`
      INSERT INTO analytics_views (customer_id, channel, timeframe, viewed_at)
      VALUES ($1, $2, $3, NOW())
    `, [customerId, channel, timeframe]);
  } catch (error) {
    // Non-critical, just log
    console.log('Could not track analytics view:', error.message);
  }
}

function getEmptyMetrics() {
  return {
    universal: {
      total_interactions: 0,
      ai_engagement_rate: 0,
      contact_capture_rate: 0,
      hot_leads_total: 0
    },
    channelSpecific: {},
    crossChannel: {}
  };
}

// Placeholder functions for features you'll implement
async function getTemplateUsage(customerId, dateFilter) { return 0; }
async function getAutoResponseCount(customerId, dateFilter) { return 0; }
async function getOptOutRate(customerId, dateFilter) { return 0; }
async function getMediaMessageCount(customerId, dateFilter) { return 0; }
async function getWidgetImpressions(customerId, dateFilter) { return 0; }
async function getProactiveChatCount(customerId, dateFilter) { return 0; }

/**
 * 📱 CHANNEL-SPECIFIC WRAPPER FUNCTIONS
 * Just like your AI service - thin wrappers for convenience
 */

// Quick function for email analytics
export async function getEmailAnalytics(customerId, timeframe = '30d') {
  return getAnalytics({
    channel: 'email',
    customerId,
    timeframe
  });
}

// Quick function for SMS analytics
export async function getSMSAnalytics(customerId, timeframe = '30d') {
  return getAnalytics({
    channel: 'sms',
    customerId,
    timeframe
  });
}

// Quick function for chat analytics
export async function getChatAnalytics(customerId, timeframe = '30d') {
  return getAnalytics({
    channel: 'chat',
    customerId,
    timeframe
  });
}

// Quick function for social analytics
export async function getSocialAnalytics(customerId, platform, timeframe = '30d') {
  return getAnalytics({
    channel: platform, // 'facebook' or 'instagram'
    customerId,
    timeframe
  });
}

// Quick function for cross-channel overview
export async function getAllChannelAnalytics(customerId, timeframe = '30d') {
  return getAnalytics({
    channel: 'all',
    customerId,
    timeframe
  });
}
