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
    console.log('📋 Fetching lead details for:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id, business_name FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // Get lead details from unified view
    const leadQuery = `
      WITH lead_events AS (
        SELECT 
          customer_id,
          MIN(created_at) as first_interaction,
          MAX(created_at) as last_interaction,
          COUNT(*) as total_interactions,
          COUNT(DISTINCT DATE(created_at)) as interaction_days,
          COUNT(DISTINCT channel) as channels_used,
          STRING_AGG(DISTINCT channel, ', ') as all_channels,
          
          -- Extract contact info from metadata
          MAX(CASE WHEN metadata->>'email' IS NOT NULL THEN metadata->>'email' END) as email,
          MAX(CASE WHEN metadata->>'phone' IS NOT NULL THEN metadata->>'phone' END) as phone,
          MAX(CASE WHEN metadata->>'name' IS NOT NULL THEN metadata->>'name' END) as name,
          MAX(CASE WHEN metadata->>'company' IS NOT NULL THEN metadata->>'company' END) as company,
          MAX(CASE WHEN metadata->>'location' IS NOT NULL THEN metadata->>'location' END) as location,
          
          -- Count specific events
          COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_lead_count,
          COUNT(CASE WHEN event_type = 'appointment_scheduled' THEN 1 END) as appointments_count,
          COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_requests,
          
          -- Get last message
          MAX(CASE WHEN metadata->>'message' IS NOT NULL THEN metadata->>'message' END) as last_message,
          
          -- Calculate value
          SUM(COALESCE((metadata->>'value')::DECIMAL, 0)) as total_value,
          
          -- Get most recent channel
          (ARRAY_AGG(channel ORDER BY created_at DESC))[1] as primary_channel
          
        FROM ai_analytics_events
        WHERE customer_id = $1
        GROUP BY customer_id
      ),
      scored_leads AS (
        SELECT 
          *,
          -- Calculate lead score (0-100)
          LEAST(100, 
            -- Engagement score (40 points max)
            CASE 
              WHEN hot_lead_count > 0 THEN 20
              WHEN appointments_count > 0 THEN 15
              WHEN phone_requests > 0 THEN 10
              ELSE 5
            END +
            CASE 
              WHEN total_interactions > 10 THEN 20
              WHEN total_interactions > 5 THEN 15
              WHEN total_interactions > 2 THEN 10
              ELSE 5
            END +
            
            -- Recency score (20 points max)
            CASE 
              WHEN last_interaction > NOW() - INTERVAL '1 day' THEN 20
              WHEN last_interaction > NOW() - INTERVAL '3 days' THEN 15
              WHEN last_interaction > NOW() - INTERVAL '7 days' THEN 10
              WHEN last_interaction > NOW() - INTERVAL '14 days' THEN 5
              ELSE 0
            END +
            
            -- Contact info score (20 points max)
            CASE WHEN email IS NOT NULL THEN 10 ELSE 0 END +
            CASE WHEN phone IS NOT NULL THEN 10 ELSE 0 END +
            
            -- Frequency score (20 points max)
            CASE 
              WHEN interaction_days >= 5 THEN 20
              WHEN interaction_days >= 3 THEN 15
              WHEN interaction_days >= 2 THEN 10
              ELSE 5
            END
          ) as score
        FROM lead_events
      )
      SELECT 
        $2::TEXT as id,  -- Use the leadId parameter
        COALESCE(name, email, phone, 'Unknown') as name,
        email,
        phone,
        company,
        location,
        score,
        CASE 
          WHEN score >= 70 THEN 'HOT'
          WHEN score >= 40 THEN 'WARM'
          ELSE 'COLD'
        END as temperature,
        total_interactions,
        first_interaction,
        last_interaction,
        hot_lead_count,
        appointments_count,
        phone_requests,
        total_value as value,
        primary_channel,
        all_channels,
        channels_used,
        interaction_days,
        last_message,
        
        -- Score breakdown
        json_build_object(
          'engagement', CASE 
            WHEN hot_lead_count > 0 THEN 20
            WHEN appointments_count > 0 THEN 15
            WHEN phone_requests > 0 THEN 10
            ELSE 5
          END +
          CASE 
            WHEN total_interactions > 10 THEN 20
            WHEN total_interactions > 5 THEN 15
            WHEN total_interactions > 2 THEN 10
            ELSE 5
          END,
          'recency', CASE 
            WHEN last_interaction > NOW() - INTERVAL '1 day' THEN 20
            WHEN last_interaction > NOW() - INTERVAL '3 days' THEN 15
            WHEN last_interaction > NOW() - INTERVAL '7 days' THEN 10
            WHEN last_interaction > NOW() - INTERVAL '14 days' THEN 5
            ELSE 0
          END,
          'contact', CASE WHEN email IS NOT NULL THEN 10 ELSE 0 END +
                    CASE WHEN phone IS NOT NULL THEN 10 ELSE 0 END,
          'frequency', CASE 
            WHEN interaction_days >= 5 THEN 20
            WHEN interaction_days >= 3 THEN 15
            WHEN interaction_days >= 2 THEN 10
            ELSE 5
          END
        ) as score_breakdown,
        
        -- Calculate average response time (mock for now)
        ROUND(EXTRACT(EPOCH FROM (last_interaction - first_interaction)) / NULLIF(total_interactions - 1, 0) / 60) as avg_response_time
        
      FROM scored_leads
      WHERE 1=1  -- This is where we'd filter by lead ID if we had a proper lead table
      LIMIT 1`;

    const leadResult = await query(leadQuery, [customerId, leadId]);

    if (!leadResult.rows.length) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadResult.rows[0];

    // Get recent events for this lead
    const eventsQuery = `
      SELECT 
        event_type,
        channel,
        created_at,
        metadata
      FROM ai_analytics_events
      WHERE customer_id = $1
        AND (
          metadata->>'email' = $2 OR 
          metadata->>'phone' = $3 OR
          (metadata->>'name' = $4 AND $4 IS NOT NULL)
        )
      ORDER BY created_at DESC
      LIMIT 50`;

    const eventsResult = await query(
      eventsQuery, 
      [customerId, lead.email, lead.phone, lead.name]
    );

    // Get notes for this lead (from a hypothetical notes table)
    let notes = '';
    let noteHistory = [];
    
    try {
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
      // Notes table might not exist yet
      console.log('Notes table not found, skipping');
    }

    // Add some mock tags based on behavior
    const tags = [];
    if (lead.hot_lead_count > 0) tags.push('Hot Lead');
    if (lead.appointments_count > 0) tags.push('Appointment Scheduled');
    if (lead.phone_requests > 0) tags.push('Phone Requested');
    if (lead.channels_used > 1) tags.push('Multi-Channel');
    if (lead.total_interactions > 10) tags.push('Highly Engaged');
    if (lead.value > 0) tags.push('High Value');

    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        created_at: lead.first_interaction,
        recent_events: eventsResult.rows.slice(0, 5),
        all_events: eventsResult.rows,
        notes: notes,
        note_history: noteHistory,
        tags: tags
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
