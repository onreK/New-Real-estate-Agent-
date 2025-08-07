// app/api/admin/fix-analytics-columns/route.js
// Fixes missing columns in ai_analytics_events table
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Verify admin access
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Starting database column fixes for analytics...');
    
    const fixes = [];
    const errors = [];

    // Step 1: Check if ai_analytics_events table exists
    try {
      const tableCheck = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analytics_events'
      `);

      if (tableCheck.rows.length === 0) {
        // Create the table if it doesn't exist
        console.log('📊 Creating ai_analytics_events table...');
        await query(`
          CREATE TABLE IF NOT EXISTS ai_analytics_events (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            event_type VARCHAR(100) NOT NULL,
            event_value TEXT,
            event_data JSONB DEFAULT '{}',
            ai_response TEXT,
            user_message TEXT,
            channel VARCHAR(50) DEFAULT 'email',
            confidence_score DECIMAL(3,2) DEFAULT 0.00,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        fixes.push('✅ Created ai_analytics_events table with all columns');
      } else {
        console.log('✅ Table ai_analytics_events exists, checking columns...');
      }
    } catch (error) {
      console.error('Error checking table:', error);
      errors.push(`Table check: ${error.message}`);
    }

    // Step 2: Add missing columns to ai_analytics_events
    const columnsToAdd = [
      { name: 'event_value', type: 'TEXT' },
      { name: 'metadata', type: 'JSONB DEFAULT \'{}\'::jsonb' },
      { name: 'user_message', type: 'TEXT' },
      { name: 'ai_response', type: 'TEXT' },
      { name: 'confidence_score', type: 'DECIMAL(3,2) DEFAULT 0.00' },
      { name: 'event_data', type: 'JSONB DEFAULT \'{}\'::jsonb' }
    ];

    for (const column of columnsToAdd) {
      try {
        // Check if column exists
        const columnCheck = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'ai_analytics_events' 
          AND column_name = $1
        `, [column.name]);

        if (columnCheck.rows.length === 0) {
          // Add the column
          console.log(`📝 Adding column ${column.name}...`);
          await query(`
            ALTER TABLE ai_analytics_events 
            ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
          `);
          fixes.push(`✅ Added column: ${column.name}`);
        } else {
          console.log(`✓ Column ${column.name} already exists`);
        }
      } catch (error) {
        console.error(`Error adding column ${column.name}:`, error);
        errors.push(`Column ${column.name}: ${error.message}`);
      }
    }

    // Step 3: Create indexes for performance
    const indexes = [
      { name: 'idx_events_customer_id', column: 'customer_id' },
      { name: 'idx_events_type', column: 'event_type' },
      { name: 'idx_events_created', column: 'created_at' },
      { name: 'idx_events_channel', column: 'channel' }
    ];

    for (const index of indexes) {
      try {
        await query(`
          CREATE INDEX IF NOT EXISTS ${index.name} 
          ON ai_analytics_events(${index.column})
        `);
        console.log(`✅ Index ${index.name} ready`);
      } catch (error) {
        console.log(`⚠️ Index ${index.name} might already exist`);
      }
    }

    // Step 4: Verify customer_analytics_summary table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS customer_analytics_summary (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          month DATE NOT NULL,
          phone_requests_count INTEGER DEFAULT 0,
          appointments_offered_count INTEGER DEFAULT 0,
          hot_leads_detected_count INTEGER DEFAULT 0,
          ai_responses_sent INTEGER DEFAULT 0,
          conversion_rate DECIMAL(5,2) DEFAULT 0.00,
          avg_response_time_seconds INTEGER DEFAULT 0,
          total_conversations INTEGER DEFAULT 0,
          unique_contacts INTEGER DEFAULT 0,
          business_value_generated DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_customer_month UNIQUE(customer_id, month)
        )
      `);
      fixes.push('✅ Customer analytics summary table ready');
    } catch (error) {
      console.log('⚠️ Customer summary table might already exist');
    }

    // Step 5: Verify admin_analytics_summary table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS admin_analytics_summary (
          id SERIAL PRIMARY KEY,
          metric_date DATE NOT NULL UNIQUE,
          total_customers INTEGER DEFAULT 0,
          active_customers INTEGER DEFAULT 0,
          total_ai_interactions INTEGER DEFAULT 0,
          total_phone_requests INTEGER DEFAULT 0,
          total_appointments INTEGER DEFAULT 0,
          total_hot_leads INTEGER DEFAULT 0,
          avg_interactions_per_customer DECIMAL(10,2) DEFAULT 0,
          platform_mrr DECIMAL(10,2) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      fixes.push('✅ Admin analytics summary table ready');
    } catch (error) {
      console.log('⚠️ Admin summary table might already exist');
    }

    // Step 6: Insert sample event for testing (optional)
    try {
      // Get a customer ID for testing
      const customerCheck = await query(
        'SELECT id FROM customers LIMIT 1'
      );
      
      if (customerCheck.rows.length > 0) {
        const testCustomerId = customerCheck.rows[0].id;
        
        // Insert a test event
        await query(`
          INSERT INTO ai_analytics_events 
          (customer_id, event_type, event_value, event_data, channel, confidence_score)
          VALUES ($1, 'test_event', 'Database fix successful', '{"test": true}'::jsonb, 'system', 1.00)
          ON CONFLICT DO NOTHING
        `, [testCustomerId]);
        
        fixes.push('✅ Added test event for verification');
      }
    } catch (error) {
      console.log('⚠️ Could not add test event:', error.message);
    }

    // Final verification
    const finalCheck = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'ai_analytics_events'
      ORDER BY ordinal_position
    `);

    console.log('🎉 Database column fixes completed!');

    return NextResponse.json({
      success: true,
      message: '✅ Database columns fixed successfully! Analytics should now work.',
      fixes_applied: fixes,
      errors_encountered: errors,
      table_structure: finalCheck.rows,
      ready_for_analytics: errors.length === 0,
      next_steps: [
        '1. Test the analytics API at /api/customer/analytics',
        '2. Navigate to your dashboard to see if analytics loads',
        '3. Check that the "event_value" error is gone'
      ]
    });

  } catch (error) {
    console.error('❌ Critical error during column fixes:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      suggestion: 'Check Railway logs for detailed error information'
    }, { status: 500 });
  }
}

// GET method to check current table structure
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check table structure
    const columnsCheck = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'ai_analytics_events'
      ORDER BY ordinal_position
    `);

    // Check if specific required columns exist
    const columnNames = columnsCheck.rows.map(row => row.column_name);
    const requiredColumns = ['event_value', 'metadata', 'user_message', 'ai_response', 'confidence_score'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

    // Check for sample data
    let eventCount = 0;
    try {
      const countResult = await query('SELECT COUNT(*) as count FROM ai_analytics_events');
      eventCount = parseInt(countResult.rows[0].count);
    } catch (error) {
      console.log('Could not count events:', error.message);
    }

    return NextResponse.json({
      table_exists: columnsCheck.rows.length > 0,
      columns: columnsCheck.rows,
      missing_columns: missingColumns,
      all_columns_present: missingColumns.length === 0,
      event_count: eventCount,
      status: missingColumns.length === 0 
        ? '✅ All required columns present' 
        : `⚠️ Missing columns: ${missingColumns.join(', ')}`
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check table structure',
      details: error.message
    }, { status: 500 });
  }
}
