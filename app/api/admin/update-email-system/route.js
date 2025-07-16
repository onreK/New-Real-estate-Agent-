// app/api/admin/update-email-system/route.js
import { getDbClient } from '../../../../lib/database';
import { NextResponse } from 'next/server';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔄 Starting email system database update (customer-based structure)...');

    // Add new columns to existing email_settings table (customer-based)
    console.log('📧 Adding new columns to email_settings table...');
    
    const newColumns = [
      // Email filtering columns
      { name: 'auto_archive_spam', type: 'BOOLEAN DEFAULT true' },
      { name: 'block_mass_emails', type: 'BOOLEAN DEFAULT true' },
      { name: 'personal_only', type: 'BOOLEAN DEFAULT false' },
      { name: 'skip_auto_generated', type: 'BOOLEAN DEFAULT true' },
      
      // Response rule columns
      { name: 'business_hours_only', type: 'BOOLEAN DEFAULT true' },
      { name: 'urgent_priority', type: 'BOOLEAN DEFAULT true' },
      
      // Monitoring columns
      { name: 'monitoring_enabled', type: 'BOOLEAN DEFAULT true' },
      { name: 'last_monitored', type: 'TIMESTAMP' },
      { name: 'auto_refresh_interval', type: 'INTEGER DEFAULT 30' },
      
      // AI enhancement columns
      { name: 'ai_model', type: 'VARCHAR(100) DEFAULT \'gpt-4o-mini\'' },
      { name: 'ai_temperature', type: 'DECIMAL(3,2) DEFAULT 0.7' },
      { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 350' },
      
      // Analytics columns
      { name: 'emails_processed_today', type: 'INTEGER DEFAULT 0' },
      { name: 'ai_responses_sent_today', type: 'INTEGER DEFAULT 0' },
      { name: 'last_stats_reset', type: 'DATE DEFAULT CURRENT_DATE' }
    ];

    for (const column of newColumns) {
      try {
        await client.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`✅ Added column ${column.name} to email_settings`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Column ${column.name} already exists in email_settings`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    // Create email_monitoring_logs table for tracking (customer-based)
    console.log('📊 Creating email_monitoring_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_monitoring_logs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        emails_found INTEGER DEFAULT 0,
        emails_processed INTEGER DEFAULT 0,
        emails_filtered INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        processing_time_ms INTEGER,
        gmail_connected BOOLEAN DEFAULT false
      )
    `);
    console.log('✅ email_monitoring_logs table created/verified');

    // Create email_filter_logs table for tracking what gets filtered (customer-based)
    console.log('🔍 Creating email_filter_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_filter_logs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        email_from VARCHAR(255) NOT NULL,
        email_subject VARCHAR(500),
        filter_reason VARCHAR(255) NOT NULL,
        filter_type VARCHAR(100) NOT NULL,
        filtered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gmail_message_id VARCHAR(255)
      )
    `);
    console.log('✅ email_filter_logs table created/verified');

    // Create ai_response_analytics table for tracking AI performance (customer-based)
    console.log('🤖 Creating ai_response_analytics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_response_analytics (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        gmail_message_id VARCHAR(255),
        customer_email VARCHAR(255),
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_tokens INTEGER,
        model VARCHAR(100),
        temperature DECIMAL(3,2),
        response_time_ms INTEGER,
        confidence_score DECIMAL(3,2),
        auto_sent BOOLEAN DEFAULT false,
        customer_reply_received BOOLEAN DEFAULT false,
        customer_reply_time_hours INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ ai_response_analytics table created/verified');

    // Add indexes for performance
    console.log('🚀 Creating performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_monitoring_logs_customer_id ON email_monitoring_logs(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_monitoring_logs_timestamp ON email_monitoring_logs(check_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_customer_id ON email_filter_logs(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_filtered_at ON email_filter_logs(filtered_at)',
      'CREATE INDEX IF NOT EXISTS idx_ai_response_analytics_customer_id ON ai_response_analytics(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_response_analytics_created_at ON ai_response_analytics(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_email_settings_customer_id ON email_settings(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_settings_monitoring_enabled ON email_settings(monitoring_enabled)'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        const indexName = indexQuery.split(' ')[5]; // Extract index name
        console.log(`✅ Index created: ${indexName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Index already exists: ${error.message.split('"')[1]}`);
        } else {
          console.error(`❌ Error creating index:`, error.message);
        }
      }
    }

    // Create default settings for existing customers who don't have email_settings yet
    console.log('👥 Creating default email settings for existing customers...');
    
    const defaultSettingsQuery = `
      INSERT INTO email_settings (
        customer_id, setup_method, business_name, email_address,
        tone, expertise, auto_response_enabled, alert_hot_leads,
        include_availability, ask_qualifying_questions, require_approval,
        auto_archive_spam, block_mass_emails, personal_only, skip_auto_generated,
        business_hours_only, urgent_priority, monitoring_enabled,
        auto_refresh_interval, ai_model, ai_temperature
      )
      SELECT 
        c.id, 
        'enhanced_system',
        COALESCE(c.business_name, 'My Business'),
        COALESCE(c.email, CONCAT(LOWER(REPLACE(COALESCE(c.business_name, 'business'), ' ', '')), '@intellihub.ai')),
        'professional',
        'Business Services',
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        30,
        'gpt-4o-mini',
        0.7
      FROM customers c
      WHERE c.id NOT IN (SELECT customer_id FROM email_settings WHERE customer_id IS NOT NULL)
      ON CONFLICT (customer_id) DO NOTHING
    `;
    
    const defaultResult = await client.query(defaultSettingsQuery);
    console.log(`✅ Created default email settings for ${defaultResult.rowCount} customers`);

    // Verify the update worked
    console.log('🔍 Verifying database update...');
    
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(es.id) as customers_with_email_settings,
        COUNT(CASE WHEN es.monitoring_enabled THEN 1 END) as monitoring_enabled_count
      FROM customers c
      LEFT JOIN email_settings es ON c.id = es.customer_id
    `;
    
    const verifyResult = await client.query(verifyQuery);
    const stats = verifyResult.rows[0];
    
    console.log('📊 Database update verification:');
    console.log(`   Total customers: ${stats.total_customers}`);
    console.log(`   Customers with email settings: ${stats.customers_with_email_settings}`);
    console.log(`   Customers with monitoring enabled: ${stats.monitoring_enabled_count}`);

    console.log('🎉 Email system database update completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Email system database updated successfully',
      stats: {
        totalCustomers: parseInt(stats.total_customers),
        customersWithEmailSettings: parseInt(stats.customers_with_email_settings),
        monitoringEnabledCount: parseInt(stats.monitoring_enabled_count)
      },
      updates: [
        'Added email filtering columns to email_settings',
        'Added response rule columns to email_settings', 
        'Added monitoring and analytics columns',
        'Created email_monitoring_logs table',
        'Created email_filter_logs table',
        'Created ai_response_analytics table',
        'Added performance indexes',
        `Created default settings for ${defaultResult.rowCount} existing customers`
      ]
    });

  } catch (error) {
    console.error('❌ Email system database update failed:', error);
    
    return NextResponse.json({
      error: 'Database update failed',
      details: error.message,
      suggestion: 'Check database permissions and try again'
    }, { status: 500 });
  } finally {
    client.release();
  }
}
