import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/database';
import { getLeads } from '@/lib/leads-service';

/**
 * This API demonstrates using the centralized leads service
 * to get only hot leads for notifications/alerts
 */
export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer ID
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer not found'
      });
    }

    const customerId = customerResult.rows[0].id;

    // Use centralized leads service with filters
    const hotLeadsResult = await getLeads({
      customerId,
      temperatureFilter: 'hot',  // Only get hot leads
      sortBy: 'recent',          // Most recent first
      limit: 10                  // Top 10 hot leads
    });

    // Format for alert/notification display
    const alerts = hotLeadsResult.leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      contact: lead.email || lead.phone,
      score: lead.score,
      last_activity: lead.last_interaction,
      channel: lead.primary_channel,
      urgency: lead.score >= 90 ? 'critical' : lead.score >= 80 ? 'high' : 'medium',
      action_required: 'Contact immediately'
    }));

    return NextResponse.json({
      success: true,
      hot_leads_count: alerts.length,
      alerts: alerts,
      message: alerts.length > 0 
        ? `You have ${alerts.length} hot leads requiring immediate attention!`
        : 'No hot leads at the moment'
    });

  } catch (error) {
    console.error('Error fetching hot leads alerts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hot leads',
      details: error.message
    }, { status: 500 });
  }
}
