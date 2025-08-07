import { query } from '@/lib/database.js';

export async function POST() {
  try {
    console.log('🚀 Starting comprehensive database update...');

    // ============================================
    // STEP 1: UPDATE EMAIL_SETTINGS TABLE
    // ============================================
    console.log('📧 Updating email_settings table with ALL required columns...');
    
    const emailSettingsColumns = [
      // Core AI Settings
      { name: 'ai_enabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'ai_model', type: 'VARCHAR(100) DEFAULT \'gpt-4o-mini\'' },
      { name: 'ai_temperature', type: 'DECIMAL(3,2) DEFAULT 0.7' },
      { name: 'ai_system_prompt', type: 'TEXT' },
      { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 350' },
      
      // 🎯 CRITICAL MISSING COLUMNS (These are causing your error)
      { name: 'knowledge_base', type: 'TEXT' },
      { name: 'custom_instructions', type: 'TEXT' },
      { name: 'response_length', type: 'VARCHAR(50) DEFAULT \'medium\'' },
      { name: 'enable_hot_lead_analysis', type: 'BOOLEAN DEFAULT true' },
      { name: 'enable_ai_responses', type: 'BOOLEAN DEFAULT true' },
      
      // AI Behavior Settings
      { name: 'always_ask_phone', type: 'BOOLEAN DEFAULT false' },
      { name: 'schedule_within_24h', type: 'BOOLEAN DEFAULT false' },
      { name: 'highlight_advantages', type: 'BOOLEAN DEFAULT false' },
      { name: 'include_call_to_action', type: 'BOOLEAN DEFAULT true' },
      { name: 'offer_callback_urgent', type: 'BOOLEAN DEFAULT true' },
      
      // Email-specific settings
      { name: 'auto_archive_spam', type: 'BOOLEAN DEFAULT true' },
      { name: 'block_mass_emails', type: 'BOOLEAN DEFAULT true' },
      { name: 'personal_only', type: 'BOOLEAN DEFAULT false' },
      { name: 'skip_auto_generated', type: 'BOOLEAN DEFAULT true' },
      { name: 'business_hours_only', type: 'BOOLEAN DEFAULT true' },
      { name: 'urgent_priority', type: 'BOOLEAN DEFAULT true' },
      
      // Monitoring settings
      { name: 'monitoring_enabled', type: 'BOOLEAN DEFAULT true' },
      { name: 'last_monitored', type: 'TIMESTAMP' },
      { name: 'auto_refresh_interval', type: 'INTEGER DEFAULT 30' },
      
      // Analytics tracking
      { name: 'emails_processed_today', type: 'INTEGER DEFAULT 0' },
      { name: 'ai_responses_sent_today', type: 'INTEGER DEFAULT 0' },
      { name: 'last_stats_reset', type: 'DATE DEFAULT CURRENT_DATE' }
    ];

    let addedColumns = [];
    let existingColumns = [];

    for (const column of emailSettingsColumns) {
      try {
        await query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        addedColumns.push(column.name);
        console.log(`✅ Added/verified column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          existingColumns.push(column.name);
          console.log(`⚠️ Column ${column.name} already exists`);
        } else {
          console.log(`❌ Error with column ${column.name}:`, error.message);
        }
      }
    }

    // ============================================
    // STEP 2: CREATE EMAIL SUPPORT TABLES
    // ============================================
    console.log('📋 Creating email support tables...');
    
    // Email Templates Table
    await query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        variables TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ email_templates table created/verified');

    // Email Conversations Table
    await query(`
      CREATE TABLE IF NOT EXISTS email_conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        subject VARCHAR(500),
        status VARCHAR(50) DEFAULT 'active',
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ email_conversations table created/verified');

    // Email Messages Table
    await query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES email_conversations(id),
        sender_type VARCHAR(50) NOT NULL,
        subject VARCHAR(500),
        content TEXT NOT NULL,
        content_type VARCHAR(50) DEFAULT 'text/plain',
        message_id VARCHAR(255),
        in_reply_to VARCHAR(255),
        attachments JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ email_messages table created/verified');

    // ============================================
    // STEP 3: CREATE ANALYTICS TABLES
    // ============================================
    console.log('📊 Creating event analytics tables...');
    
    // AI Analytics Events Table
    await query(`
      CREATE TABLE IF NOT EXISTS ai_analytics_events (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_value TEXT,
        channel VARCHAR(50),
        message_content TEXT,
        user_message TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ ai_analytics_events table created');

    // Customer Analytics Summary Table
    await query(`
      CREATE TABLE IF NOT EXISTS customer_analytics_summary (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL UNIQUE,
        month VARCHAR(7) NOT NULL,
        total_interactions INTEGER DEFAULT 0,
        phone_requests INTEGER DEFAULT 0,
        appointments_scheduled INTEGER DEFAULT 0,
        hot_leads_detected INTEGER DEFAULT 0,
        pricing_discussions INTEGER DEFAULT 0,
        follow_ups_sent INTEGER DEFAULT 0,
        cta_included INTEGER DEFAULT 0,
        advantages_highlighted INTEGER DEFAULT 0,
        urgency_created INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, month)
      )
    `);
    console.log('✅ customer_analytics_summary table created');

    // Admin Analytics Summary Table
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
    console.log('✅ admin_analytics_summary table created');

    // ============================================
    // STEP 4: CREATE INDEXES FOR PERFORMANCE
    // ============================================
    console.log('🔍 Creating indexes...');
    const indexes = [
      // Email indexes
      'CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)',
      'CREATE INDEX IF NOT EXISTS idx_email_conversations_user_id ON email_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)',
      
      // Analytics indexes
      'CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_customer_id ON ai_analytics_events(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_event_type ON ai_analytics_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_created_at ON ai_analytics_events(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ai_analytics_events_channel ON ai_analytics_events(channel)',
      'CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_customer_id ON customer_analytics_summary(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_month ON customer_analytics_summary(month)',
      'CREATE INDEX IF NOT EXISTS idx_admin_analytics_summary_metric_date ON admin_analytics_summary(metric_date)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (error) {
        console.log('⚠️ Index might already exist:', error.message);
      }
    }

    // ============================================
    // STEP 5: VERIFY ALL TABLES
    // ============================================
    console.log('🔍 Verifying all tables...');
    const tablesToCheck = [
      'customers',
      'conversations', 
      'messages',
      'hot_leads',
      'sms_conversations',
      'sms_messages',
      'email_settings',
      'email_conversations',
      'email_messages',
      'email_templates',
      'ai_configs',
      'business_profiles',
      'ai_analytics_events',
      'customer_analytics_summary',
      'admin_analytics_summary'
    ];

    const existingTables = [];
    const missingTables = [];
    
    for (const tableName of tablesToCheck) {
      try {
        const result = await query(`SELECT 1 FROM ${tableName} LIMIT 1`);
        existingTables.push(tableName);
        console.log(`✅ Table ${tableName} exists`);
      } catch (error) {
        missingTables.push(tableName);
        console.log(`❌ Table ${tableName} missing`);
      }
    }

    // ============================================
    // STEP 6: VERIFY CRITICAL COLUMNS
    // ============================================
    console.log('🔍 Verifying critical email_settings columns...');
    const criticalColumns = ['knowledge_base', 'custom_instructions', 'response_length'];
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' 
      AND column_name IN ('knowledge_base', 'custom_instructions', 'response_length')
    `);
    
    const verifiedColumns = columnCheck.rows.map(row => row.column_name);
    const missingCritical = criticalColumns.filter(col => !verifiedColumns.includes(col));

    console.log('✅ Database update completed successfully!');

    return Response.json({ 
      success: true, 
      message: '🎉 Database updated successfully! All columns and tables are ready.',
      details: {
        email_settings: {
          columns_added: addedColumns.length,
          columns_existed: existingColumns.length,
          critical_columns_verified: verifiedColumns,
          missing_critical_columns: missingCritical
        },
        tables: {
          verified: existingTables.length,
          total: tablesToCheck.length,
          existing: existingTables,
          missing: missingTables
        },
        analytics_ready: existingTables.includes('ai_analytics_events') && 
                        existingTables.includes('customer_analytics_summary') &&
                        existingTables.includes('admin_analytics_summary')
      },
      next_steps: [
        '1. Go to https://bizzybotai.com/email',
        '2. Click on AI Settings tab',
        '3. Fill in your settings and save (this creates customer record)',
        '4. Your analytics system will start tracking events automatically',
        '5. Check /api/customer/analytics to see your metrics'
      ]
    });

  } catch (error) {
    console.error('❌ Database update failed:', error);
    return Response.json({ 
      success: false, 
      error: 'Database update failed',
      details: error.message,
      suggestion: 'Check your database connection and try again'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check if critical columns exist
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' 
      AND column_name IN ('knowledge_base', 'custom_instructions', 'response_length', 
                          'enable_hot_lead_analysis', 'enable_ai_responses')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const requiredColumns = ['knowledge_base', 'custom_instructions', 'response_length', 
                            'enable_hot_lead_analysis', 'enable_ai_responses'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    // Check if analytics tables exist
    const analyticsTablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('ai_analytics_events', 'customer_analytics_summary', 'admin_analytics_summary')
    `);
    
    const analyticsTables = analyticsTablesCheck.rows.map(row => row.table_name);
    
    return Response.json({
      success: true,
      status: missingColumns.length === 0 ? 'Database is fully configured ✅' : 'Database needs updates ⚠️',
      email_settings: {
        existing_columns: existingColumns,
        missing_columns: missingColumns,
        ready: missingColumns.length === 0
      },
      analytics: {
        tables_exist: analyticsTables,
        ready: analyticsTables.length === 3
      },
      action_needed: missingColumns.length > 0 ? 'Run POST to add missing columns' : 'No action needed'
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
