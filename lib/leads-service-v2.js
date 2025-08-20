// lib/leads-service-v2.js
// UPDATED VERSION - Works with the new contacts table after migration
// This replaces leads-service.js after you run the migration

import { query } from './database';

/**
 * 🎯 Main function to get all leads from contacts table
 * MULTI-TENANT SAFE - Always filters by customer_id
 */
export async function getLeads({
  customerId,
  channel = 'all',
  temperatureFilter = 'all',
  searchTerm = '',
  sortBy = 'score',
  limit = 100,
  offset = 0
}) {
  try {
    // CRITICAL: Always validate customerId for multi-tenancy
    if (!customerId) {
      throw new Error('Customer ID is required for multi-tenant data access');
    }
    
    // Build the WHERE clause with customer_id ALWAYS first
    let whereConditions = ['c.customer_id = $1', 'c.is_active = true'];
    let params = [customerId];
    
    // Add channel filter
    if (channel !== 'all') {
      params.push(channel);
      whereConditions.push(`c.source_channel = $${params.length}`);
    }
    
    // Add temperature filter
    if (temperatureFilter !== 'all') {
      params.push(temperatureFilter);
      whereConditions.push(`c.lead_temperature = $${params.length}`);
    }
    
    // Add search filter
    if (searchTerm) {
      params.push(`%${searchTerm}%`);
      const searchParam = `$${params.length}`;
      whereConditions.push(`(
        c.name ILIKE ${searchParam}
        OR c.email ILIKE ${searchParam}
        OR c.phone ILIKE ${searchParam}
        OR c.company ILIKE ${searchParam}
      )`);
    }
    
    // Build ORDER BY clause
    let orderBy = 'c.lead_score DESC'; // Default
    switch (sortBy) {
      case 'recent':
        orderBy = 'c.last_interaction_at DESC NULLS LAST';
        break;
      case 'value':
        orderBy = 'c.potential_value DESC NULLS LAST';
        break;
      case 'name':
        orderBy = 'c.name ASC';
        break;
      case 'score':
      default:
        orderBy = 'c.lead_score DESC';
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contacts c
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Get the leads with pagination
    params.push(limit);
    params.push(offset);
    
    const leadsQuery = `
      SELECT 
        c.id,
        c.customer_id,
        c.name,
        c.email,
        c.phone,
        c.company,
        c.title,
        c.location,
        c.lead_score,
        c.lead_temperature,
        c.lead_status,
        c.potential_value,
        c.first_interaction_at,
        c.last_interaction_at,
        c.total_interactions,
        c.hot_lead_count,
        c.appointment_count,
        c.phone_request_count,
        c.source_channel,
        c.channels_used,
        c.tags,
        c.created_at,
        -- Get recent events for this contact
        (
          SELECT COUNT(*)
          FROM ai_analytics_events e
          WHERE e.contact_id = c.id
            AND e.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ) as recent_activity_count,
        -- Get last event type
        (
          SELECT e.event_type
          FROM ai_analytics_events e
          WHERE e.contact_id = c.id
          ORDER BY e.created_at DESC
          LIMIT 1
        ) as last_event_type
      FROM contacts c
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const leadsResult = await query(leadsQuery, params);
    
    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'hot') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'warm') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'cold') as cold,
        SUM(potential_value) as total_value,
        AVG(lead_score) as avg_score
      FROM contacts c
      WHERE ${whereConditions.slice(0, -2).join(' AND ')} -- Exclude pagination params
    `;
    
    const summaryResult = await query(summaryQuery, params.slice(0, -2));
    const summary = {
      total: parseInt(summaryResult.rows[0].total),
      hot: parseInt(summaryResult.rows[0].hot),
      warm: parseInt(summaryResult.rows[0].warm),
      cold: parseInt(summaryResult.rows[0].cold),
      total_value: parseFloat(summaryResult.rows[0].total_value) || 0,
      avg_score: Math.round(parseFloat(summaryResult.rows[0].avg_score) || 0)
    };
    
    return {
      success: true,
      leads: leadsResult.rows,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary,
      filters_applied: {
        channel,
        temperature: temperatureFilter,
        search: searchTerm,
        sort: sortBy
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getLeads:', error);
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
 * MULTI-TENANT SAFE - Validates customer_id ownership
 */
export async function getLeadDetails(customerId, contactId) {
  try {
    // CRITICAL: Verify the contact belongs to this customer
    const contactResult = await query(`
      SELECT * FROM contacts 
      WHERE id = $1 AND customer_id = $2 AND is_active = true
    `, [contactId, customerId]);
    
    if (contactResult.rows.length === 0) {
      return {
        success: false,
        error: 'Contact not found or access denied'
      };
    }
    
    const contact = contactResult.rows[0];
    
    // Get all interactions for this contact
    const interactions = await query(`
      SELECT 
        e.id,
        e.event_type,
        e.channel,
        e.user_message,
        e.ai_response,
        e.metadata,
        e.confidence_score,
        e.created_at
      FROM ai_analytics_events e
      WHERE e.contact_id = $1 AND e.customer_id = $2
      ORDER BY e.created_at DESC
      LIMIT 100
    `, [contactId, customerId]);
    
    // Get contact events
    const events = await query(`
      SELECT * FROM contact_events
      WHERE contact_id = $1 AND customer_id = $2
      ORDER BY created_at DESC
      LIMIT 50
    `, [contactId, customerId]);
    
    // Build timeline
    const timeline = buildLeadTimeline(interactions.rows, events.rows);
    
    return {
      success: true,
      lead: {
        ...contact,
        interactions: interactions.rows,
        events: events.rows,
        timeline: timeline
      }
    };
    
  } catch (error) {
    console.error('❌ Error getting lead details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🎯 Create or update a contact
 * MULTI-TENANT SAFE - Creates within customer's scope
 */
export async function createOrUpdateContact(customerId, contactData) {
  try {
    const {
      email,
      phone,
      name,
      company,
      title,
      location,
      source_channel,
      tags
    } = contactData;
    
    // Check if contact exists (by email or phone)
    let existingContact = null;
    
    if (email) {
      const emailCheck = await query(`
        SELECT * FROM contacts 
        WHERE customer_id = $1 AND email = $2 AND is_active = true
      `, [customerId, email]);
      existingContact = emailCheck.rows[0];
    }
    
    if (!existingContact && phone) {
      const phoneCheck = await query(`
        SELECT * FROM contacts 
        WHERE customer_id = $1 AND phone = $2 AND is_active = true
      `, [customerId, phone]);
      existingContact = phoneCheck.rows[0];
    }
    
    if (existingContact) {
      // Update existing contact
      const updateResult = await query(`
        UPDATE contacts SET
          name = COALESCE($1, name),
          company = COALESCE($2, company),
          title = COALESCE($3, title),
          location = COALESCE($4, location),
          email = COALESCE($5, email),
          phone = COALESCE($6, phone),
          tags = CASE 
            WHEN $7::text[] IS NOT NULL 
            THEN ARRAY(SELECT DISTINCT unnest(tags || $7::text[]))
            ELSE tags 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND customer_id = $9
        RETURNING *
      `, [
        name, company, title, location,
        email, phone, tags,
        existingContact.id, customerId
      ]);
      
      return {
        success: true,
        contact: updateResult.rows[0],
        action: 'updated'
      };
      
    } else {
      // Create new contact
      const insertResult = await query(`
        INSERT INTO contacts (
          customer_id, email, phone, name, company, 
          title, location, source_channel, tags,
          first_interaction_at, last_interaction_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `, [
        customerId, email, phone, name || 'Unknown',
        company, title, location, source_channel, tags
      ]);
      
      return {
        success: true,
        contact: insertResult.rows[0],
        action: 'created'
      };
    }
    
  } catch (error) {
    console.error('❌ Error creating/updating contact:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔄 Update lead score and temperature
 * MULTI-TENANT SAFE - Updates within customer scope
 */
export async function updateLeadScoring(customerId, contactId) {
  try {
    // Get contact with latest metrics
    const contact = await query(`
      SELECT 
        c.*,
        COUNT(e.id) as total_events,
        MAX(e.created_at) as last_event
      FROM contacts c
      LEFT JOIN ai_analytics_events e ON e.contact_id = c.id
      WHERE c.id = $1 AND c.customer_id = $2
      GROUP BY c.id
    `, [contactId, customerId]);
    
    if (contact.rows.length === 0) {
      throw new Error('Contact not found');
    }
    
    const lead = contact.rows[0];
    
    // Calculate new score
    const score = calculateLeadScore(lead);
    const temperature = classifyLeadTemperature(score, lead);
    const value = estimateLeadValue(lead);
    
    // Update the contact
    await query(`
      UPDATE contacts SET
        lead_score = $1,
        lead_temperature = $2,
        potential_value = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND customer_id = $5
    `, [score, temperature, value, contactId, customerId]);
    
    return {
      success: true,
      score,
      temperature,
      potential_value: value
    };
    
  } catch (error) {
    console.error('❌ Error updating lead scoring:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📈 Track a new lead event
 * MULTI-TENANT SAFE - Creates events within customer scope
 */
export async function trackLeadEvent(customerId, contactId, eventData) {
  try {
    const { type, channel, message, ai_response, metadata, confidence_score } = eventData;
    
    // Verify contact belongs to customer
    const contactCheck = await query(
      'SELECT id FROM contacts WHERE id = $1 AND customer_id = $2',
      [contactId, customerId]
    );
    
    if (contactCheck.rows.length === 0) {
      throw new Error('Contact not found or access denied');
    }
    
    // Insert event into ai_analytics_events
    await query(`
      INSERT INTO ai_analytics_events (
        customer_id, contact_id, event_type, channel,
        user_message, ai_response, metadata, confidence_score,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `, [
      customerId, contactId, type, channel,
      message, ai_response, metadata, confidence_score
    ]);
    
    // Update contact metrics
    const updateMetrics = {
      'hot_lead': 'hot_lead_count = hot_lead_count + 1',
      'appointment_scheduled': 'appointment_count = appointment_count + 1',
      'phone_request': 'phone_request_count = phone_request_count + 1'
    };
    
    if (updateMetrics[type]) {
      await query(`
        UPDATE contacts SET
          ${updateMetrics[type]},
          total_interactions = total_interactions + 1,
          last_interaction_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND customer_id = $2
      `, [contactId, customerId]);
    } else {
      await query(`
        UPDATE contacts SET
          total_interactions = total_interactions + 1,
          last_interaction_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND customer_id = $2
      `, [contactId, customerId]);
    }
    
    // Update lead scoring
    await updateLeadScoring(customerId, contactId);
    
    // Track in contact_events for detailed history
    const scoreImpact = calculateScoreImpact(type);
    await query(`
      INSERT INTO contact_events (
        customer_id, contact_id, event_type, event_category,
        channel, description, metadata, score_impact, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `, [
      customerId, contactId, type,
      categorizeEvent(type), channel,
      `${type} via ${channel}`, metadata, scoreImpact
    ]);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error tracking lead event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔍 Search for duplicate contacts
 * MULTI-TENANT SAFE - Searches within customer scope
 */
export async function findDuplicateContacts(customerId, limit = 50) {
  try {
    const duplicates = await query(`
      WITH duplicate_groups AS (
        SELECT 
          LOWER(TRIM(name)) as normalized_name,
          email,
          phone,
          COUNT(*) as duplicate_count,
          ARRAY_AGG(id ORDER BY created_at) as contact_ids,
          ARRAY_AGG(name) as names,
          ARRAY_AGG(company) as companies
        FROM contacts
        WHERE customer_id = $1 AND is_active = true
        GROUP BY LOWER(TRIM(name)), email, phone
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_groups
      ORDER BY duplicate_count DESC
      LIMIT $2
    `, [customerId, limit]);
    
    return {
      success: true,
      duplicates: duplicates.rows
    };
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error);
    return {
      success: false,
      error: error.message,
      duplicates: []
    };
  }
}

/**
 * 🔀 Merge duplicate contacts
 * MULTI-TENANT SAFE - Merges within customer scope
 */
export async function mergeContacts(customerId, primaryContactId, duplicateContactIds) {
  try {
    // Begin transaction
    await query('BEGIN');
    
    // Verify all contacts belong to this customer
    const verifyResult = await query(`
      SELECT id FROM contacts 
      WHERE customer_id = $1 
        AND id = ANY($2::int[])
    `, [customerId, [primaryContactId, ...duplicateContactIds]]);
    
    if (verifyResult.rows.length !== duplicateContactIds.length + 1) {
      throw new Error('Some contacts not found or access denied');
    }
    
    // Update all events to point to primary contact
    for (const duplicateId of duplicateContactIds) {
      await query(`
        UPDATE ai_analytics_events 
        SET contact_id = $1 
        WHERE contact_id = $2 AND customer_id = $3
      `, [primaryContactId, duplicateId, customerId]);
      
      await query(`
        UPDATE contact_events 
        SET contact_id = $1 
        WHERE contact_id = $2 AND customer_id = $3
      `, [primaryContactId, duplicateId, customerId]);
    }
    
    // Aggregate metrics from duplicates to primary
    const metricsResult = await query(`
      SELECT 
        SUM(total_interactions) as total_interactions,
        SUM(hot_lead_count) as hot_lead_count,
        SUM(appointment_count) as appointment_count,
        SUM(phone_request_count) as phone_request_count
      FROM contacts
      WHERE id = ANY($1::int[]) AND customer_id = $2
    `, [duplicateContactIds, customerId]);
    
    const metrics = metricsResult.rows[0];
    
    // Update primary contact with aggregated metrics
    await query(`
      UPDATE contacts SET
        total_interactions = total_interactions + $1,
        hot_lead_count = hot_lead_count + $2,
        appointment_count = appointment_count + $3,
        phone_request_count = phone_request_count + $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND customer_id = $6
    `, [
      metrics.total_interactions || 0,
      metrics.hot_lead_count || 0,
      metrics.appointment_count || 0,
      metrics.phone_request_count || 0,
      primaryContactId,
      customerId
    ]);
    
    // Mark duplicates as merged
    await query(`
      UPDATE contacts SET
        is_active = false,
        merged_with_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::int[]) AND customer_id = $3
    `, [primaryContactId, duplicateContactIds, customerId]);
    
    // Commit transaction
    await query('COMMIT');
    
    // Update scoring for primary contact
    await updateLeadScoring(customerId, primaryContactId);
    
    return {
      success: true,
      merged_count: duplicateContactIds.length,
      primary_contact_id: primaryContactId
    };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('❌ Error merging contacts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateLeadScore(lead) {
  let score = 0;
  
  // Engagement signals (40 points max)
  if (lead.hot_lead_count > 0) score += 20;
  if (lead.appointment_count > 0) score += 15;
  if (lead.phone_request_count > 0) score += 10;
  
  // Recency (20 points max)
  if (lead.last_event || lead.last_interaction_at) {
    const lastDate = lead.last_event || lead.last_interaction_at;
    const daysSince = Math.floor((new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) score += 20;
    else if (daysSince <= 1) score += 15;
    else if (daysSince <= 3) score += 10;
    else if (daysSince <= 7) score += 5;
  }
  
  // Contact completeness (20 points max)
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  
  // Frequency (20 points max)
  const interactions = lead.total_interactions || lead.total_events || 0;
  if (interactions >= 10) score += 20;
  else if (interactions >= 5) score += 15;
  else if (interactions >= 3) score += 10;
  else if (interactions >= 1) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

function classifyLeadTemperature(score, lead) {
  if (score >= 70 || lead.hot_lead_count > 0 || lead.appointment_count > 0) {
    return 'hot';
  }
  if (score >= 40 || lead.phone_request_count > 0) {
    return 'warm';
  }
  return 'cold';
}

function estimateLeadValue(lead) {
  // Based on your pricing tiers
  if (lead.appointment_count > 0) return 497;
  if (lead.hot_lead_count > 0) return 297;
  if (lead.phone_request_count > 0) return 197;
  return 97;
}

function buildLeadTimeline(interactions, events) {
  const timeline = [];
  
  // Add interactions
  interactions.forEach(i => {
    timeline.push({
      type: 'interaction',
      date: i.created_at,
      event_type: i.event_type,
      channel: i.channel,
      message: i.user_message,
      response: i.ai_response,
      metadata: i.metadata
    });
  });
  
  // Add events
  events.forEach(e => {
    timeline.push({
      type: 'event',
      date: e.created_at,
      event_type: e.event_type,
      category: e.event_category,
      description: e.description,
      metadata: e.metadata
    });
  });
  
  // Sort by date
  return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function calculateScoreImpact(eventType) {
  const impacts = {
    'hot_lead': 20,
    'appointment_scheduled': 15,
    'phone_request': 10,
    'email_request': 5,
    'pricing_discussed': 8,
    'demo_requested': 12,
    'contact_captured': 3
  };
  return impacts[eventType] || 1;
}

function categorizeEvent(eventType) {
  const categories = {
    'hot_lead': 'conversion',
    'appointment_scheduled': 'conversion',
    'phone_request': 'engagement',
    'email_request': 'engagement',
    'message_received': 'communication',
    'ai_response': 'communication'
  };
  return categories[eventType] || 'engagement';
}

// Export all functions
export default {
  getLeads,
  getLeadDetails,
  createOrUpdateContact,
  updateLeadScoring,
  trackLeadEvent,
  findDuplicateContacts,
  mergeContacts
};
