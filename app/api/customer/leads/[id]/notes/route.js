import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { userId } = auth();
    const user = await currentUser();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    const { notes } = await request.json();

    console.log('📝 Saving notes for lead:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id, business_name FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;
    const userName = user?.firstName + ' ' + user?.lastName || user?.emailAddresses[0]?.emailAddress || 'User';

    // First, try to create the lead_notes table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS lead_notes (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        lead_id TEXT NOT NULL,
        notes TEXT,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, lead_id)
      )
    `);

    // Insert or update the notes
    const upsertResult = await query(
      `INSERT INTO lead_notes (customer_id, lead_id, notes, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (customer_id, lead_id)
       DO UPDATE SET 
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [customerId, leadId, notes, userName]
    );

    return NextResponse.json({
      success: true,
      notes: upsertResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Lead notes API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save notes' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;

    // Get customer info
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // Get the notes
    const notesResult = await query(
      `SELECT * FROM lead_notes 
       WHERE customer_id = $1 AND lead_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [customerId, leadId]
    );

    return NextResponse.json({
      success: true,
      notes: notesResult.rows[0] || null
    });

  } catch (error) {
    console.error('❌ Get lead notes API Error:', error);
    
    // If the table doesn't exist, return empty notes
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        notes: null
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to get notes' },
      { status: 500 }
    );
  }
}
