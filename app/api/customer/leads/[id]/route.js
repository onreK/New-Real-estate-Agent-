import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    console.log('📋 Fetching lead details for ID:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id, business_name FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // Get lead details from contacts table (SAME SOURCE AS MAIN PAGE)
    const leadQuery = `
      SELECT 
        c.id,
        c.customer_id,
        c.name,
        c.email,
        c.phone,
        c.company,
        c.title,
        c.location,
        COALESCE(c.lead_score, 0) as score,
        COALESCE(c.lead_temperature, 'cold') as temperature,
        COALESCE(c.lead_status, 'new') as status,
        COALESCE(c.potential_value, 0) as value,
        c.first_interaction_at,
        c.last_interaction_at as last_interaction,
        COALESCE(c.total_interactions, 0) as total_interactions,
        COALESCE(c.hot_lead_count, 0) as hot_lead_count,
        COALESCE(c.appointment_count, 0) as appointments_count,
        COALESCE(c.phone_request_count, 0) as phone_requests,
        COALESCE(c.source_channel, 'unknown') as primary_channel,
        c.channels_used,
        c.tags,
        c.created_at,
        c.updated_at,
        -- Calculate score breakdown for display
        json_build_object(
          'engagement', LEAST(40, 
            CASE 
              WHEN c.hot_lead_count > 0 THEN 20
              WHEN c.appointment_count > 0 THEN 15
              WHEN c.phone_request_count > 0 THEN 10
              ELSE 5
            END +
            CASE 
              WHEN c.total_interactions > 10 THEN 20
              WHEN c.total_interactions > 5 THEN 15
              WHEN c.total_interactions > 2 THEN 10
              ELSE 5
            END
          ),
          'recency', CASE 
            WHEN c.last_interaction_at > NOW() - INTERVAL '1 day' THEN 20
            WHEN c.last_interaction_at > NOW() - INTERVAL '3 days' THEN 15
            WHEN c.last_interaction_at > NOW() - INTERVAL '7 days' THEN 10
            WHEN c.last_interaction_at > NOW() - INTERVAL '14 days' THEN 5
            ELSE 0
          END,
          'contact', CASE WHEN c.email IS NOT NULL THEN 10 ELSE 0 END +
                    CASE WHEN c.phone IS NOT NULL THEN 10 ELSE 0 END,
          'frequency', CASE 
            WHEN c.total_interactions >= 10 THEN 20
            WHEN c.total_interactions >= 5 THEN 15
            WHEN c.total_interactions >= 3 THEN 10
            WHEN c.total_interactions >= 1 THEN 5
            ELSE 0
          END
        ) as score_breakdown,
        -- Calculate average response time in minutes
        CASE 
          WHEN c.total_interactions > 1 THEN
            ROUND(EXTRACT(EPOCH FROM (c.last_interaction_at - c.first_interaction_at)) / NULLIF(c.total_interactions - 1, 0) / 60)
          ELSE 1
        END as avg_response_time
      FROM contacts c
      WHERE c.id = $1 AND c.customer_id = $2`;

    const leadResult = await query(leadQuery, [leadId, customerId]);

    if (!leadResult.rows.length) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadResult.rows[0];

    // Get recent events from ai_analytics_events for timeline
    // Use contact_id if available, otherwise try to match by email
    const eventsQuery = `
      SELECT 
        e.event_type,
        e.channel,
        e.created_at,
        e.metadata,
        e.user_message,
        e.ai_response
      FROM ai_analytics_events e
      WHERE e.customer_id = $1
        AND (
          e.contact_id = $2
          OR (e.metadata->>'email' = $3 AND $3 IS NOT NULL)
          OR (e.metadata->>'phone' = $4 AND $4 IS NOT NULL)
        )
      ORDER BY e.created_at DESC
      LIMIT 50`;

    const eventsResult = await query(
      eventsQuery, 
      [customerId, leadId, lead.email, lead.phone]
    );

    // Get notes for this lead (create table if doesn't exist)
    let notes = '';
    let noteHistory = [];
    
    try {
      // First, ensure the lead_notes table exists
      await query(`
        CREATE TABLE IF NOT EXISTS lead_notes (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          lead_id INTEGER NOT NULL,
          notes TEXT,
          updated_by TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
      `);

      const notesResult = await query(
        `SELECT notes, updated_at, updated_by 
         FROM lead_notes 
         WHERE customer_id = $1 AND lead_id = $2 
         ORDER BY updated_at DESC 
         LIMIT 1`,
        [customerId, leadId]
      );
      
      if (notesResult.rows.length > 0) {
        notes = notesResult.rows[0].notes;
      }
      
      // Get note history
      const historyResult = await query(
        `SELECT updated_at, updated_by 
         FROM lead_notes 
         WHERE customer_id = $1 AND lead_id = $2 
         ORDER BY updated_at DESC 
         LIMIT 10`,
        [customerId, leadId]
      );
      
      noteHistory = historyResult.rows;
    } catch (err) {
      console.log('Notes table setup:', err.message);
    }

    // Get last message from contact_events or ai_analytics_events
    let lastMessage = null;
    if (eventsResult.rows.length > 0) {
      const lastEvent = eventsResult.rows[0];
      lastMessage = lastEvent.user_message || lastEvent.metadata?.message || null;
    }

    // Build tags based on behavior
    const tags = [];
    if (lead.hot_lead_count > 0) tags.push('Hot Lead');
    if (lead.appointments_count > 0) tags.push('Appointment Scheduled');
    if (lead.phone_requests > 0) tags.push('Phone Requested');
    if (lead.channels_used && lead.channels_used.length > 1) tags.push('Multi-Channel');
    if (lead.total_interactions > 10) tags.push('Highly Engaged');
    if (lead.value > 0) tags.push('High Value');

    // Convert temperature to uppercase for consistency with UI
    lead.temperature = (lead.temperature || 'cold').toUpperCase();

    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        last_message: lastMessage,
        recent_events: eventsResult.rows.slice(0, 5),
        all_events: eventsResult.rows,
        notes: notes,
        note_history: noteHistory,
        tags: lead.tags || tags
      }
    });

  } catch (error) {
    console.error('❌ Lead details API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead details' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a lead
export async function DELETE(request, { params }) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    console.log('🗑️ Deleting lead:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // Verify the lead belongs to this customer before deleting
    const verifyResult = await query(
      'SELECT id FROM contacts WHERE id = $1 AND customer_id = $2',
      [leadId, customerId]
    );

    if (!verifyResult.rows.length) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Delete the lead (cascade will handle related records)
    await query(
      'DELETE FROM contacts WHERE id = $1 AND customer_id = $2',
      [leadId, customerId]
    );

    console.log('✅ Lead deleted successfully:', leadId);

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
