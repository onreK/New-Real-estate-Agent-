// app/api/admin/fix-events-table/route.js
// Quick fix to create the missing ai_analytics_events table
import { NextResponse } from 'next/server';
import { query } from '@/lib/database.js';

export async function POST() {
  try {
    console.log('🔧 Creating ai_analytics_events table...');
    
    // Create the table WITHOUT inline index syntax (PostgreSQL doesn't support it)
    await query(`
      CREATE TABLE IF NOT EXISTS ai_analytics_events (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        ai_response TEXT,
        user_message TEXT,
        channel VARCHAR(50) DEFAULT 'email',
        confidence_score DECIMAL(3,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Table created, adding indexes...');
    
    // Create indexes separately (correct PostgreSQL syntax)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_events_customer_id ON ai_analytics_events(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_type ON ai_analytics_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_events_created ON ai_analytics_events(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_events_channel ON ai_analytics_events(channel)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await query(indexSql);
        console.log(`✅ Index created: ${indexSql.match(/idx_\w+/)[0]}`);
      } catch (indexError) {
        console.log(`⚠️ Index might already exist: ${indexError.message}`);
      }
    }
    
    // Verify all tables exist
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_analytics_events', 'customer_analytics_summary', 'admin_analytics_summary')
    `);
    
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    const allTablesExist = existingTables.length === 3;
    
    return NextResponse.json({
      success: true,
      message: allTablesExist 
        ? '✅ All analytics tables are now ready!' 
        : '⚠️ Some tables might still be missing',
      tables_found: existingTables,
      all_tables_exist: allTablesExist,
      ready_for_analytics: allTablesExist
    });
    
  } catch (error) {
    console.error('❌ Error creating events table:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      suggestion: 'Try running the SQL manually in Railway database console'
    }, { status: 500 });
  }
}

// GET method to check status
export async function GET() {
  try {
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_analytics_events', 'customer_analytics_summary', 'admin_analytics_summary')
      ORDER BY table_name
    `);
    
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    
    // Check for sample data
    let hasData = false;
    if (existingTables.includes('ai_analytics_events')) {
      const dataCheck = await query('SELECT COUNT(*) as count FROM ai_analytics_events');
      hasData = parseInt(dataCheck.rows[0].count) > 0;
    }
    
    return NextResponse.json({
      analytics_ready: existingTables.length === 3,
      tables: {
        ai_analytics_events: existingTables.includes('ai_analytics_events'),
        customer_analytics_summary: existingTables.includes('customer_analytics_summary'),
        admin_analytics_summary: existingTables.includes('admin_analytics_summary')
      },
      has_event_data: hasData,
      message: existingTables.length === 3 
        ? '✅ All tables exist - analytics ready!' 
        : `⚠️ Missing ${3 - existingTables.length} table(s)`
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check tables',
      details: error.message
    }, { status: 500 });
  }
}
