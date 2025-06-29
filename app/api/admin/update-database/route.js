// app/api/admin/update-database/route.js
import { NextResponse } from 'next/server';
import { getDbClient } from '../../../../lib/database';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔧 Starting database updates...');

    // Add missing columns to email_settings table
    const columnUpdates = [
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS tone VARCHAR(50) DEFAULT \'professional\'',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS expertise VARCHAR(255)',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS specialties VARCHAR(255)',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS response_style TEXT',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS alert_hot_leads BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS include_availability BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ask_qualifying_questions BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false'
    ];

    for (const update of columnUpdates) {
      try {
        await client.query(update);
        console.log('✅ Column update successful:', update.split(' ')[5]);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ Column already exists:', update.split(' ')[5]);
        } else {
          console.error('❌ Column update failed:', error);
        }
      }
    }

    // Create email_templates table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(50) DEFAULT 'custom',
          subject VARCHAR(500),
          content TEXT NOT NULL,
          variables TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Email templates table created');
    } catch (error) {
      console.error('❌ Email templates table creation failed:', error);
    }

    // Verify all tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tablesResult = await client.query(tablesQuery);
    
    console.log('📊 All database tables:', tablesResult.rows.map(r => r.table_name));

    return NextResponse.json({
      success: true,
      message: 'Database updated successfully',
      tables: tablesResult.rows.map(r => r.table_name),
      updatesRun: columnUpdates.length + 1
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
