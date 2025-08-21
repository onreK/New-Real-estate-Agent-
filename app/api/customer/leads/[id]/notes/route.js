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
    const userName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.emailAddresses?.[0]?.emailAddress || 'User';

    // CRITICAL SECURITY CHECK: Verify the lead belongs to this customer
    const verifyResult = await query(
      'SELECT id FROM contacts WHERE id = $1 AND customer_id = $2',
      [leadId, customerId]
    );

    if (!verifyResult.rows.length) {
      console.log('⚠️ Unauthorized access attempt to lead:', leadId, 'by customer:', customerId);
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Create the lead_notes table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS lead_notes (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        lead_id INTEGER NOT NULL,
        notes TEXT,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, lead_id)
      )
    `);

    // Create index for faster lookups if it doesn't exist
    await query(`
      CREATE INDEX IF NOT EXISTS idx_lead_notes_customer_lead 
      ON lead_notes(customer_id, lead_id)
    `).catch(() => {}); // Ignore if index already exists

    // Insert or update the notes with proper integer conversion
    const upsertResult = await query(
      `INSERT INTO lead_notes (customer_id, lead_id, notes, updated_by, updated_at, created_at)
       VALUES ($1, $2::INTEGER, $3, $4, NOW(), NOW())
       ON CONFLICT (customer_id, lead_id)
       DO UPDATE SET 
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [customerId, leadId, notes || '', userName]
    );

    console.log('✅ Notes saved successfully for lead:', leadId);

    return NextResponse.json({
      success: true,
      notes: upsertResult.rows[0],
      message: 'Notes saved successfully'
    });

  } catch (error) {
    console.error('❌ Lead notes save error:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '22P02') {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save notes', details: error.message },
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
    console.log('📖 Fetching notes for lead:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // SECURITY CHECK: Verify the lead belongs to this customer
    const verifyResult = await query(
      'SELECT id FROM contacts WHERE id = $1 AND customer_id = $2',
      [leadId, customerId]
    );

    if (!verifyResult.rows.length) {
      console.log('⚠️ Unauthorized access attempt to lead notes:', leadId, 'by customer:', customerId);
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Get the notes - handle both integer and text lead_id for backward compatibility
    let notesResult;
    try {
      notesResult = await query(
        `SELECT * FROM lead_notes 
         WHERE customer_id = $1 AND lead_id = $2::INTEGER
         ORDER BY updated_at DESC
         LIMIT 1`,
        [customerId, leadId]
      );
    } catch (castError) {
      // If casting fails, try as text (for backward compatibility)
      notesResult = await query(
        `SELECT * FROM lead_notes 
         WHERE customer_id = $1 AND lead_id::TEXT = $2
         ORDER BY updated_at DESC
         LIMIT 1`,
        [customerId, leadId]
      );
    }

    // Get note history (last 10 updates)
    let historyResult;
    try {
      historyResult = await query(
        `SELECT updated_by, updated_at 
         FROM lead_notes 
         WHERE customer_id = $1 AND lead_id = $2::INTEGER
         ORDER BY updated_at DESC
         LIMIT 10`,
        [customerId, leadId]
      );
    } catch {
      historyResult = { rows: [] };
    }

    return NextResponse.json({
      success: true,
      notes: notesResult.rows[0] || null,
      history: historyResult.rows || []
    });

  } catch (error) {
    console.error('❌ Get lead notes error:', error);
    
    // If the table doesn't exist, return empty notes
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        notes: null,
        history: []
      });
    }
    
    // Handle invalid lead ID format
    if (error.code === '22P02') {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get notes', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove notes for a lead
export async function DELETE(request, { params }) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    console.log('🗑️ Deleting notes for lead:', leadId);

    // Get customer info
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );

    if (!customerResult.rows.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerId = customerResult.rows[0].id;

    // SECURITY CHECK: Verify the lead belongs to this customer
    const verifyResult = await query(
      'SELECT id FROM contacts WHERE id = $1 AND customer_id = $2',
      [leadId, customerId]
    );

    if (!verifyResult.rows.length) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Delete the notes
    const deleteResult = await query(
      'DELETE FROM lead_notes WHERE customer_id = $1 AND lead_id = $2::INTEGER RETURNING id',
      [customerId, leadId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notes to delete'
      });
    }

    console.log('✅ Notes deleted for lead:', leadId);

    return NextResponse.json({
      success: true,
      message: 'Notes deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete lead notes error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notes', details: error.message },
      { status: 500 }
    );
  }
}
