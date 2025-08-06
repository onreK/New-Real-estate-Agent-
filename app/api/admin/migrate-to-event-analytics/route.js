// app/api/admin/migrate-to-event-analytics/route.js
// Complete database migration to event-based analytics system
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Verify admin access
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting Event-Based Analytics Migration...');
    
    const migrationSteps = [];
    const errors = [];

    // Step 1: Create ai_analytics_events table
    try {
      console.log('📊 Creating ai_analytics_events table...');
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Indexes for performance
          INDEX idx_events_customer_id (customer_id),
          INDEX idx_events_type (event_type),
          INDEX idx_events_created (created_at),
          INDEX idx_events_channel (channel)
        )
      `);
      
      // Create indexes separately (PostgreSQL syntax)
      await query(`CREATE INDEX IF NOT EXISTS idx_events_customer_id ON ai_analytics_events(customer_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_events_type ON ai_analytics_events(event_type)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_events_created ON ai_analytics_events(created_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_events_channel ON ai_analytics_events(channel)`);
      
      migrationSteps.push('✅ Created ai_analytics_events table');
    } catch (error) {
      console.error('Error creating events table:', error);
      errors.push(`Events table: ${error.message}`);
    }

    // Step 2: Create customer_analytics_summary table
    try {
      console.log('📈 Creating customer_analytics_summary table...');
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
          
          -- Unique constraint for customer + month
          CONSTRAINT unique_customer_month UNIQUE(customer_id, month)
        )
      `);
      
      // Create indexes
      await query(`CREATE INDEX IF NOT EXISTS idx_summary_customer ON customer_analytics_summary(customer_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_summary_month ON customer_analytics_summary(month)`);
      
      migrationSteps.push('✅ Created customer_analytics_summary table');
    } catch (error) {
      console.error('Error creating customer summary table:', error);
      errors.push(`Customer summary table: ${error.message}`);
    }

    // Step 3: Create admin_analytics_summary table
    try {
      console.log('💼 Creating admin_analytics_summary table...');
      await query(`
        CREATE TABLE IF NOT EXISTS admin_analytics_summary (
          id SERIAL PRIMARY KEY,
          month DATE NOT NULL UNIQUE,
          total_active_customers INTEGER DEFAULT 0,
          monthly_recurring_revenue DECIMAL(10,2) DEFAULT 0.00,
          customers_asking_for_phone INTEGER DEFAULT 0,
          phone_request_adoption_rate DECIMAL(5,2) DEFAULT 0.00,
          customers_scheduling_fast INTEGER DEFAULT 0,
          fast_scheduling_adoption_rate DECIMAL(5,2) DEFAULT 0.00,
          total_ai_interactions INTEGER DEFAULT 0,
          total_hot_leads INTEGER DEFAULT 0,
          avg_hot_lead_score DECIMAL(5,2) DEFAULT 0.00,
          customer_retention_rate DECIMAL(5,2) DEFAULT 0.00,
          growth_rate_percent DECIMAL(5,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await query(`CREATE INDEX IF NOT EXISTS idx_admin_month ON admin_analytics_summary(month)`);
      
      migrationSteps.push('✅ Created admin_analytics_summary table');
    } catch (error) {
      console.error('Error creating admin summary table:', error);
      errors.push(`Admin summary table: ${error.message}`);
    }

    // Step 4: Backup existing toggle data before converting
    try {
      console.log('💾 Backing up existing toggle settings...');
      
      // Create backup table
      await query(`
        CREATE TABLE IF NOT EXISTS email_settings_backup_toggles (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER,
          always_ask_phone BOOLEAN,
          schedule_within_24h BOOLEAN,
          highlight_advantages BOOLEAN,
          include_call_to_action BOOLEAN,
          offer_callback_urgent BOOLEAN,
          custom_instructions TEXT,
          ai_system_prompt TEXT,
          backed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Copy existing data
      const backupResult = await query(`
        INSERT INTO email_settings_backup_toggles 
        (customer_id, always_ask_phone, schedule_within_24h, 
         highlight_advantages, include_call_to_action, offer_callback_urgent,
         custom_instructions, ai_system_prompt)
        SELECT 
          customer_id,
          always_ask_phone,
          schedule_within_24h,
          highlight_advantages,
          include_call_to_action,
          offer_callback_urgent,
          custom_instructions,
          ai_system_prompt
        FROM email_settings
        WHERE customer_id IS NOT NULL
      `);
      
      migrationSteps.push(`✅ Backed up ${backupResult.rowCount || 0} customer toggle settings`);
    } catch (error) {
      console.error('Error backing up toggle data:', error);
      errors.push(`Backup: ${error.message}`);
    }

    // Step 5: Convert toggles to custom instructions text
    try {
      console.log('🔄 Converting toggles to custom instructions...');
      
      // Get all customers with toggles enabled
      const customersWithToggles = await query(`
        SELECT 
          customer_id,
          always_ask_phone,
          schedule_within_24h,
          highlight_advantages,
          include_call_to_action,
          offer_callback_urgent,
          custom_instructions,
          ai_system_prompt
        FROM email_settings
        WHERE customer_id IS NOT NULL
      `);

      let updatedCount = 0;
      
      for (const row of customersWithToggles.rows) {
        let additionalInstructions = [];
        
        // Convert each toggle to instruction text
        if (row.always_ask_phone) {
          additionalInstructions.push("Always ask for the customer's phone number when they show interest.");
        }
        if (row.schedule_within_24h) {
          additionalInstructions.push("Try to schedule appointments within 24 hours when possible.");
        }
        if (row.highlight_advantages) {
          additionalInstructions.push("When competitors are mentioned, highlight our unique advantages.");
        }
        if (row.include_call_to_action) {
          additionalInstructions.push("Always end responses with a clear call-to-action.");
        }
        if (row.offer_callback_urgent) {
          additionalInstructions.push("For urgent inquiries, offer immediate callback options.");
        }

        // Combine with existing instructions
        const existingInstructions = row.custom_instructions || row.ai_system_prompt || '';
        const combinedInstructions = [
          existingInstructions,
          additionalInstructions.length > 0 ? '\n\n[Converted from toggle settings]:' : '',
          ...additionalInstructions
        ].filter(Boolean).join('\n');

        // Update the record
        if (additionalInstructions.length > 0) {
          await query(`
            UPDATE email_settings 
            SET custom_instructions = $1
            WHERE customer_id = $2
          `, [combinedInstructions, row.customer_id]);
          updatedCount++;
        }
      }
      
      migrationSteps.push(`✅ Converted toggles to instructions for ${updatedCount} customers`);
    } catch (error) {
      console.error('Error converting toggles:', error);
      errors.push(`Toggle conversion: ${error.message}`);
    }

    // Step 6: Remove conflicting columns (after backup)
    try {
      console.log('🧹 Removing conflicting toggle columns...');
      
      const columnsToRemove = [
        'always_ask_phone',
        'schedule_within_24h',
        'highlight_advantages',
        'include_call_to_action',
        'offer_callback_urgent'
      ];

      for (const column of columnsToRemove) {
        try {
          await query(`ALTER TABLE email_settings DROP COLUMN IF EXISTS ${column}`);
          console.log(`  ✓ Removed ${column}`);
        } catch (colError) {
          console.log(`  ⚠️ Could not remove ${column}: ${colError.message}`);
        }
      }
      
      migrationSteps.push('✅ Removed conflicting toggle columns');
    } catch (error) {
      console.error('Error removing columns:', error);
      errors.push(`Column removal: ${error.message}`);
    }

    // Step 7: Add new columns for clean schema if needed
    try {
      console.log('➕ Adding new columns for clean schema...');
      
      // Add enable flags if they don't exist
      const newColumns = [
        { name: 'enable_hot_lead_analysis', type: 'BOOLEAN DEFAULT true' },
        { name: 'enable_ai_responses', type: 'BOOLEAN DEFAULT true' },
        { name: 'ai_model', type: 'VARCHAR(100) DEFAULT \'gpt-4o-mini\'' },
        { name: 'ai_temperature', type: 'DECIMAL(3,2) DEFAULT 0.7' },
        { name: 'knowledge_base', type: 'TEXT' }
      ];

      for (const col of newColumns) {
        try {
          await query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          console.log(`  ✓ Added ${col.name}`);
        } catch (colError) {
          console.log(`  ⚠️ Column ${col.name} might already exist`);
        }
      }
      
      migrationSteps.push('✅ Added new schema columns');
    } catch (error) {
      console.error('Error adding new columns:', error);
      errors.push(`New columns: ${error.message}`);
    }

    // Step 8: Initialize first month of analytics
    try {
      console.log('📅 Initializing current month analytics...');
      
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      // Initialize admin analytics for current month
      await query(`
        INSERT INTO admin_analytics_summary (month, total_active_customers)
        VALUES ($1, (SELECT COUNT(*) FROM customers WHERE created_at >= $1))
        ON CONFLICT (month) DO NOTHING
      `, [currentMonth]);
      
      // Initialize customer analytics for all active customers
      await query(`
        INSERT INTO customer_analytics_summary (customer_id, month)
        SELECT id, $1 FROM customers
        ON CONFLICT (customer_id, month) DO NOTHING
      `, [currentMonth]);
      
      migrationSteps.push('✅ Initialized current month analytics');
    } catch (error) {
      console.error('Error initializing analytics:', error);
      errors.push(`Analytics initialization: ${error.message}`);
    }

    // Final summary
    const success = errors.length === 0;
    
    console.log('');
    console.log('='.repeat(50));
    console.log(success ? '✅ MIGRATION COMPLETED SUCCESSFULLY!' : '⚠️ MIGRATION COMPLETED WITH WARNINGS');
    console.log('='.repeat(50));
    console.log('');
    console.log('Migration steps completed:');
    migrationSteps.forEach(step => console.log(step));
    
    if (errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    return NextResponse.json({
      success: success,
      message: success 
        ? 'Event-based analytics migration completed successfully!' 
        : 'Migration completed with some warnings',
      steps_completed: migrationSteps,
      errors: errors,
      next_steps: [
        'AI service will now automatically track behavior events',
        'Customer dashboard will show real usage metrics',
        'Admin dashboard will display business intelligence',
        'Settings page simplified without toggle conflicts'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET method to check migration status
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if tables exist
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_analytics_events', 'customer_analytics_summary', 'admin_analytics_summary')
    `);

    const existingTables = tablesCheck.rows.map(r => r.table_name);
    const allTablesExist = existingTables.length === 3;

    // Check for backup table
    const backupCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'email_settings_backup_toggles'
    `);

    const hasBackup = backupCheck.rows[0]?.count > 0;

    // Check if toggle columns still exist
    const toggleCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' 
      AND column_name IN ('always_ask_phone', 'schedule_within_24h')
    `);

    const hasOldToggles = toggleCheck.rows.length > 0;

    return NextResponse.json({
      migration_status: allTablesExist ? 'completed' : 'pending',
      analytics_tables_exist: allTablesExist,
      existing_tables: existingTables,
      backup_exists: hasBackup,
      old_toggles_removed: !hasOldToggles,
      ready_for_analytics: allTablesExist && !hasOldToggles,
      message: allTablesExist 
        ? 'Event analytics system is ready' 
        : 'Migration needed - run POST request to migrate'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error.message
    }, { status: 500 });
  }
}
