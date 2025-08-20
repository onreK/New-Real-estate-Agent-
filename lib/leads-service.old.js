/**
 * 🎯 CENTRALIZED LEADS SERVICE
 * Single source of truth for all lead-related operations
 * Similar to ai-service.js and analytics-service.js
 */

import { query } from './database';

/**
 * 🔥 Main function to get all leads with scoring and classification
 * Used by ALL channels and dashboards
 */
export async function getLeads({
  customerId,
  channel = 'all',
  temperatureFilter = 'all',
  searchTerm = '',
  sortBy = 'score',
  limit = 100
}) {
  try {
    // Fetch raw lead data from centralized events table
    const rawLeads = await fetchRawLeadData(customerId, channel);
    
    // Process and score each lead
    const scoredLeads = rawLeads.map(lead => {
      const score = calculateLeadScore(lead);
      const temperature = classifyLeadTemperature(score, lead);
      const potentialValue = estimateLeadValue(lead);
      
      return {
        ...lead,
        score,
        temperature,
        potential_value: potentialValue
      };
    });
    
    // Apply filters
    let filteredLeads = applyFilters(scoredLeads, {
      temperatureFilter,
      searchTerm
    });
    
    // Apply sorting
    filteredLeads = sortLeads(filteredLeads, sortBy);
    
    // Calculate summary statistics
    const summary = calculateLeadSummary(filteredLeads);
    
    return {
      success: true,
      leads: filteredLeads.slice(0, limit),
      total: filteredLeads.length,
      summary,
      filters_applied: {
        channel,
        temperature: temperatureFilter,
        search: searchTerm,
        sort: sortBy
      }
    };
    
  } catch (error) {
    console.error('Error in getLeads:', error);
    return {
      success: false,
      error: error.message,
      leads: [],
      summary: {}
    };
  }
}

/**
 * 📊 Get a single lead's complete history
 */
export async function getLeadDetails(customerId, leadIdentifier) {
  try {
    // Get all interactions for this lead
    const interactions = await query(`
      SELECT 
        event_type,
        channel,
        user_message,
        ai_response,
        metadata,
        created_at
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND (
          metadata->>'contact_email' = $2
          OR metadata->>'contact_phone' = $2
          OR metadata->>'contact_name' = $2
        )
      ORDER BY created_at DESC
    `, [customerId, leadIdentifier]);
    
    // Get lead summary
    const leadData = await fetchRawLeadData(customerId, 'all', leadIdentifier);
    
    if (leadData.length === 0) {
      return {
        success: false,
        error: 'Lead not found'
      };
    }
    
    const lead = leadData[0];
    const score = calculateLeadScore(lead);
    const temperature = classifyLeadTemperature(score, lead);
    
    return {
      success: true,
      lead: {
        ...lead,
        score,
        temperature,
        interactions: interactions.rows,
        timeline: buildLeadTimeline(interactions.rows)
      }
    };
    
  } catch (error) {
    console.error('Error getting lead details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🎯 Calculate lead score (0-100)
 * Centralized scoring algorithm used everywhere
 */
export function calculateLeadScore(lead) {
  let score = 0;
  
  // 1. Engagement Signals (40 points max)
  const engagementScore = calculateEngagementScore(lead);
  score += engagementScore;
  
  // 2. Recency Score (20 points max)
  const recencyScore = calculateRecencyScore(lead.last_interaction);
  score += recencyScore;
  
  // 3. Contact Completeness (20 points max)
  const contactScore = calculateContactCompletenessScore(lead);
  score += contactScore;
  
  // 4. Interaction Frequency (20 points max)
  const frequencyScore = calculateFrequencyScore(lead.interaction_count);
  score += frequencyScore;
  
  // Ensure score is between 0-100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * 🌡️ Classify lead temperature based on score and signals
 */
export function classifyLeadTemperature(score, lead) {
  // Hot leads: High score OR strong buying signals
  if (score >= 70 || 
      lead.hot_lead_count > 0 || 
      lead.appointment_count > 0) {
    return 'hot';
  }
  
  // Warm leads: Medium score OR interest signals
  if (score >= 40 || 
      lead.phone_request_count > 0 || 
      lead.pricing_discussion_count > 0) {
    return 'warm';
  }
  
  // Cold leads: Low engagement
  return 'cold';
}

/**
 * 💰 Estimate potential value based on engagement
 */
export function estimateLeadValue(lead) {
  // Based on your pricing: $97 (basic), $197 (growth), $297 (pro), $497 (premium)
  
  if (lead.appointment_count > 0) {
    return 497; // Likely premium customer
  }
  
  if (lead.hot_lead_count > 0) {
    return 297; // Likely pro customer
  }
  
  if (lead.pricing_discussion_count > 0) {
    return 197; // Likely growth customer
  }
  
  return 97; // Potential basic customer
}

/**
 * 🔍 Identify and merge duplicate leads
 */
export async function resolveLeadIdentity(customerId, email, phone, name) {
  try {
    // Check for existing leads with same identifiers
    const matches = await query(`
      SELECT DISTINCT
        metadata->>'contact_email' as email,
        metadata->>'contact_phone' as phone,
        metadata->>'contact_name' as name
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND (
          metadata->>'contact_email' = $2
          OR metadata->>'contact_phone' = $3
          OR (
            metadata->>'contact_name' = $4
            AND $4 != ''
          )
        )
    `, [customerId, email, phone, name]);
    
    // Return merged identity
    return {
      email: email || matches.rows[0]?.email,
      phone: phone || matches.rows[0]?.phone,
      name: name || matches.rows[0]?.name,
      is_duplicate: matches.rows.length > 1
    };
    
  } catch (error) {
    console.error('Error resolving lead identity:', error);
    return { email, phone, name, is_duplicate: false };
  }
}

/**
 * 📧 Track new lead event
 */
export async function trackLeadEvent(customerId, eventData) {
  try {
    const { type, channel, email, phone, name, company, message } = eventData;
    
    // Resolve lead identity first
    const identity = await resolveLeadIdentity(customerId, email, phone, name);
    
    // Create metadata
    const metadata = {
      contact_email: identity.email,
      contact_phone: identity.phone,
      contact_name: identity.name,
      company: company,
      is_merged: identity.is_duplicate
    };
    
    // Insert event
    await query(`
      INSERT INTO ai_analytics_events 
      (customer_id, event_type, channel, metadata, user_message, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [customerId, type, channel, JSON.stringify(metadata), message]);
    
    return { success: true, lead_identity: identity };
    
  } catch (error) {
    console.error('Error tracking lead event:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// INTERNAL HELPER FUNCTIONS
// ==========================================

/**
 * Fetch raw lead data from database
 */
async function fetchRawLeadData(customerId, channel = 'all', specificLead = null) {
  let whereClause = 'WHERE customer_id = $1';
  const params = [customerId];
  
  if (channel !== 'all') {
    whereClause += ' AND channel = $2';
    params.push(channel);
  }
  
  if (specificLead) {
    whereClause += ` AND (
      metadata->>'contact_email' = $${params.length + 1}
      OR metadata->>'contact_phone' = $${params.length + 1}
    )`;
    params.push(specificLead);
  }
  
  const leadsQuery = `
    WITH lead_interactions AS (
      SELECT DISTINCT ON (COALESCE(
        metadata->>'contact_email',
        metadata->>'contact_phone',
        metadata->>'contact_name',
        CONCAT('lead_', ROW_NUMBER() OVER())
      ))
        COALESCE(metadata->>'contact_email', '') as email,
        COALESCE(metadata->>'contact_phone', '') as phone,
        COALESCE(metadata->>'contact_name', 'Unknown Contact') as name,
        COALESCE(metadata->>'company', '') as company,
        channel as primary_channel,
        MAX(created_at) OVER (PARTITION BY COALESCE(metadata->>'contact_email', metadata->>'contact_phone')) as last_interaction,
        COUNT(*) OVER (PARTITION BY COALESCE(metadata->>'contact_email', metadata->>'contact_phone')) as interaction_count,
        FIRST_VALUE(user_message) OVER (
          PARTITION BY COALESCE(metadata->>'contact_email', metadata->>'contact_phone')
          ORDER BY created_at DESC
        ) as last_message
      FROM ai_analytics_events
      ${whereClause}
        AND (
          metadata->>'contact_email' IS NOT NULL 
          OR metadata->>'contact_phone' IS NOT NULL
          OR event_type IN ('hot_lead', 'phone_request', 'appointment_scheduled', 'contact_captured')
        )
    ),
    lead_events AS (
      SELECT 
        COALESCE(metadata->>'contact_email', metadata->>'contact_phone', CONCAT('lead_', id)) as lead_identifier,
        SUM(CASE WHEN event_type = 'hot_lead' THEN 1 ELSE 0 END) as hot_lead_count,
        SUM(CASE WHEN event_type = 'phone_request' THEN 1 ELSE 0 END) as phone_request_count,
        SUM(CASE WHEN event_type = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointment_count,
        SUM(CASE WHEN event_type = 'pricing_discussed' THEN 1 ELSE 0 END) as pricing_discussion_count,
        SUM(CASE WHEN event_type = 'contact_captured' THEN 1 ELSE 0 END) as contact_captured_count,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        COUNT(*) as total_events,
        ARRAY_AGG(DISTINCT channel) as channels_used
      FROM ai_analytics_events
      ${whereClause}
      GROUP BY lead_identifier
    )
    SELECT 
      li.*,
      le.hot_lead_count,
      le.phone_request_count,
      le.appointment_count,
      le.pricing_discussion_count,
      le.contact_captured_count,
      le.active_days,
      le.total_events,
      le.channels_used
    FROM lead_interactions li
    LEFT JOIN lead_events le ON COALESCE(li.email, li.phone) = le.lead_identifier
    ORDER BY li.last_interaction DESC
  `;
  
  const result = await query(leadsQuery, params);
  
  return result.rows.map((row, index) => ({
    id: index + 1,
    name: row.name || 'Unknown',
    email: row.email || null,
    phone: row.phone || null,
    company: row.company || null,
    primary_channel: row.primary_channel || 'unknown',
    channels_used: row.channels_used || [row.primary_channel],
    last_interaction: row.last_interaction,
    last_message: row.last_message,
    interaction_count: parseInt(row.interaction_count || 0),
    hot_lead_count: parseInt(row.hot_lead_count || 0),
    phone_request_count: parseInt(row.phone_request_count || 0),
    appointment_count: parseInt(row.appointment_count || 0),
    pricing_discussion_count: parseInt(row.pricing_discussion_count || 0),
    contact_captured_count: parseInt(row.contact_captured_count || 0),
    active_days: parseInt(row.active_days || 0),
    total_events: parseInt(row.total_events || 0)
  }));
}

/**
 * Calculate engagement score component
 */
function calculateEngagementScore(lead) {
  let score = 0;
  
  if (lead.hot_lead_count > 0) score += 20;
  if (lead.appointment_count > 0) score += 15;
  if (lead.phone_request_count > 0) score += 10;
  if (lead.pricing_discussion_count > 0) score += 10;
  
  return Math.min(score, 40);
}

/**
 * Calculate recency score component
 */
function calculateRecencyScore(lastInteraction) {
  const daysSinceContact = Math.floor(
    (new Date() - new Date(lastInteraction)) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceContact === 0) return 20;
  if (daysSinceContact <= 1) return 15;
  if (daysSinceContact <= 3) return 10;
  if (daysSinceContact <= 7) return 5;
  return 0;
}

/**
 * Calculate contact completeness score
 */
function calculateContactCompletenessScore(lead) {
  let score = 0;
  
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  
  return score;
}

/**
 * Calculate frequency score component
 */
function calculateFrequencyScore(interactionCount) {
  if (interactionCount >= 10) return 20;
  if (interactionCount >= 5) return 15;
  if (interactionCount >= 3) return 10;
  if (interactionCount >= 1) return 5;
  return 0;
}

/**
 * Apply filters to leads
 */
function applyFilters(leads, { temperatureFilter, searchTerm }) {
  let filtered = [...leads];
  
  // Temperature filter
  if (temperatureFilter && temperatureFilter !== 'all') {
    filtered = filtered.filter(lead => lead.temperature === temperatureFilter);
  }
  
  // Search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(lead => 
      lead.email?.toLowerCase().includes(term) ||
      lead.phone?.includes(term) ||
      lead.name?.toLowerCase().includes(term) ||
      lead.company?.toLowerCase().includes(term)
    );
  }
  
  return filtered;
}

/**
 * Sort leads by specified criteria
 */
function sortLeads(leads, sortBy) {
  const sorted = [...leads];
  
  switch (sortBy) {
    case 'score':
      return sorted.sort((a, b) => b.score - a.score);
    case 'recent':
      return sorted.sort((a, b) => 
        new Date(b.last_interaction) - new Date(a.last_interaction)
      );
    case 'value':
      return sorted.sort((a, b) => b.potential_value - a.potential_value);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

/**
 * Calculate summary statistics for leads
 */
function calculateLeadSummary(leads) {
  const summary = {
    total: leads.length,
    hot: leads.filter(l => l.temperature === 'hot').length,
    warm: leads.filter(l => l.temperature === 'warm').length,
    cold: leads.filter(l => l.temperature === 'cold').length,
    total_value: leads.reduce((sum, l) => sum + (l.potential_value || 0), 0),
    avg_score: 0,
    channels: {}
  };
  
  if (leads.length > 0) {
    summary.avg_score = Math.round(
      leads.reduce((sum, l) => sum + l.score, 0) / leads.length
    );
    
    // Count by channel
    leads.forEach(lead => {
      if (!summary.channels[lead.primary_channel]) {
        summary.channels[lead.primary_channel] = 0;
      }
      summary.channels[lead.primary_channel]++;
    });
  }
  
  return summary;
}

/**
 * Build timeline of lead interactions
 */
function buildLeadTimeline(interactions) {
  return interactions.map(interaction => ({
    date: interaction.created_at,
    type: interaction.event_type,
    channel: interaction.channel,
    message: interaction.user_message,
    response: interaction.ai_response,
    metadata: interaction.metadata
  })).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * 📊 Get lead analytics and insights
 */
export async function getLeadAnalytics(customerId, period = '30d') {
  try {
    // Calculate date range
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analytics = await query(`
      SELECT 
        COUNT(DISTINCT COALESCE(metadata->>'contact_email', metadata->>'contact_phone')) as total_leads,
        COUNT(DISTINCT CASE 
          WHEN event_type = 'hot_lead' 
          THEN COALESCE(metadata->>'contact_email', metadata->>'contact_phone')
        END) as hot_leads,
        COUNT(DISTINCT CASE 
          WHEN event_type = 'appointment_scheduled' 
          THEN COALESCE(metadata->>'contact_email', metadata->>'contact_phone')
        END) as appointments_scheduled,
        COUNT(*) as total_interactions,
        ARRAY_AGG(DISTINCT channel) as channels_used
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND created_at >= $2
        AND (
          metadata->>'contact_email' IS NOT NULL
          OR metadata->>'contact_phone' IS NOT NULL
        )
    `, [customerId, startDate]);
    
    return {
      success: true,
      analytics: analytics.rows[0],
      period: period,
      insights: generateLeadInsights(analytics.rows[0])
    };
    
  } catch (error) {
    console.error('Error getting lead analytics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate insights from lead data
 */
function generateLeadInsights(analytics) {
  const insights = [];
  
  if (analytics.hot_leads > 0) {
    insights.push({
      type: 'success',
      message: `You have ${analytics.hot_leads} hot leads ready for immediate follow-up!`
    });
  }
  
  if (analytics.appointments_scheduled > 0) {
    insights.push({
      type: 'success',
      message: `${analytics.appointments_scheduled} appointments scheduled - great conversion!`
    });
  }
  
  const conversionRate = analytics.total_leads > 0 
    ? (analytics.appointments_scheduled / analytics.total_leads * 100).toFixed(1)
    : 0;
    
  if (conversionRate > 10) {
    insights.push({
      type: 'success',
      message: `Your ${conversionRate}% conversion rate is excellent!`
    });
  } else if (conversionRate < 5 && analytics.total_leads > 10) {
    insights.push({
      type: 'warning',
      message: `Consider improving follow-up - conversion rate is only ${conversionRate}%`
    });
  }
  
  return insights;
}
