// app/api/admin/update-email-filtering/route.js
// This API endpoint adds all necessary columns for email filtering and business rules
import { getDbClient } from '@/lib/database';
import { NextResponse } from 'next/server';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔧 Setting up email filtering database structure...');

    // Add columns for email filtering settings
    console.log('📧 Adding email filtering columns to email_settings table...');
    
    const filteringColumns = [
      // Email filtering columns
      { name: 'auto_archive_spam', type: 'BOOLEAN DEFAULT true' },
      { name: 'block_mass_emails', type: 'BOOLEAN DEFAULT true' },
      { name: 'personal_only', type: 'BOOLEAN DEFAULT false' },
      { name: 'skip_auto_generated', type: 'BOOLEAN DEFAULT true' },
      
      // Business rules columns - stored as JSONB for flexibility
      { name: 'blacklist_emails', type: 'JSONB DEFAULT \'[]\'' },
      { name: 'whitelist_emails', type: 'JSONB DEFAULT \'[]\'' },
      { name: 'priority_keywords', type: 'JSONB DEFAULT \'[]\'' },
      
      // Response control columns
      { name: 'business_hours_only', type: 'BOOLEAN DEFAULT true' },
      { name: 'urgent_priority', type: 'BOOLEAN DEFAULT true' },
      { name: 'require_approval', type: 'BOOLEAN DEFAULT false' },
      
      // Additional AI behavior columns
      { name: 'custom_instructions', type: 'TEXT' },
      { name: 'always_ask_phone', type: 'BOOLEAN DEFAULT false' },
      { name: 'schedule_within_24h', type: 'BOOLEAN DEFAULT false' },
      { name: 'highlight_advantages', type: 'BOOLEAN DEFAULT false' },
      { name: 'include_call_to_action', type: 'BOOLEAN DEFAULT true' },
      { name: 'offer_callback_urgent', type: 'BOOLEAN DEFAULT true' },
      
      // AI Model settings
      { name: 'response_length', type: 'VARCHAR(50) DEFAULT \'medium\'' },
      { name: 'enable_hot_lead_analysis', type: 'BOOLEAN DEFAULT true' },
      { name: 'enable_ai_responses', type: 'BOOLEAN DEFAULT true' }
    ];

    // Add each column if it doesn't exist
    for (const column of filteringColumns) {
      try {
        await client.query(`
          ALTER TABLE email_settings 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`✅ Added/verified column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Column ${column.name} already exists`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    // Create email_filter_logs table for tracking filtered emails
    console.log('📊 Creating email_filter_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_filter_logs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        gmail_connection_id INTEGER REFERENCES gmail_connections(id),
        email_from VARCHAR(255) NOT NULL,
        email_subject VARCHAR(500),
        filter_reason VARCHAR(255) NOT NULL,
        filter_type VARCHAR(100) NOT NULL,
        matched_rule TEXT,
        filtered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gmail_message_id VARCHAR(255),
        thread_id VARCHAR(255)
      )
    `);
    console.log('✅ email_filter_logs table created/verified');

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_customer_id ON email_filter_logs(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_gmail_connection_id ON email_filter_logs(gmail_connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_filtered_at ON email_filter_logs(filtered_at)',
      'CREATE INDEX IF NOT EXISTS idx_email_filter_logs_filter_type ON email_filter_logs(filter_type)'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (error) {
        console.log('⚠️ Index might already exist:', error.message);
      }
    }

    console.log('🎉 Email filtering database setup completed!');

    return NextResponse.json({
      success: true,
      message: 'Email filtering database structure created successfully',
      features: [
        'Email filtering settings',
        'Business rules (blacklist/whitelist)',
        'Priority keywords',
        'Filter logging',
        'AI behavior settings',
        'Response control'
      ]
    });

  } catch (error) {
    console.error('❌ Database update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update database',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Filtering Database Setup',
    description: 'Use POST to create/update email filtering database structure',
    endpoint: '/api/admin/update-email-filtering'
  });
}
