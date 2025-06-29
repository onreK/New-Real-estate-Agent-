// app/api/admin/update-database/route.js
import { NextResponse } from 'next/server';
import { getDbClient } from '../../../../lib/database';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔧 Starting database updates...');

    // Add missing columns to email_settings table
    const updates = [
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS tone VARCHAR(50) DEFAULT \'professional\'',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS expertise VARCHAR(255)',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS specialties VARCHAR(255)',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS response_style TEXT',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS alert_hot_leads BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS include_availability BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ask_qualifying_questions BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false'
    ];

    for (const update of updates) {
      try {
        await client.query(update);
        console.log('✅ Database update successful:', update.split(' ')[5]); // Column name
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ Column already exists:', update.split(' ')[5]);
        } else {
          console.error('❌ Database update failed:', error);
        }
      }
    }

    // Verify table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' 
      ORDER BY ordinal_position
    `);

    console.log('📊 Email settings table structure:', tableInfo.rows);

    return NextResponse.json({
      success: true,
      message: 'Database updated successfully',
      columns: tableInfo.rows,
      updatesRun: updates.length
    });

  } catch (error) {
    console.error('❌ Database update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database update failed',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database update endpoint - use POST to run updates',
    timestamp: new Date().toISOString()
  });
}
