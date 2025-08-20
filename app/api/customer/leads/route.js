import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/database';
import { getLeads, getLeadDetails } from '@/lib/leads-service';

/**
 * GET /api/customer/leads
 * Fetch all leads using centralized lead service
 */
export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer ID from clerk user ID
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer not found',
        leads: [] 
      });
    }

    const customerId = customerResult.rows[0].id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'all';
    const temperatureFilter = searchParams.get('temperature') || 'all';
    const searchTerm = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'score';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Use centralized leads service
    const result = await getLeads({
      customerId,
      channel,
      temperatureFilter,
      searchTerm,
      sortBy,
      limit
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in leads API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch leads',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/customer/leads/[id]
 * Get specific lead details
 */
export async function POST(request) {
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
    const { leadIdentifier } = await request.json();

    // Use centralized service to get lead details
    const result = await getLeadDetails(customerId, leadIdentifier);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error getting lead details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get lead details',
      details: error.message
    }, { status: 500 });
  }
}
