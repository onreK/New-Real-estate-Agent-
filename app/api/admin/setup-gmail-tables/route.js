import { NextResponse } from 'next/server';
import { query } from '@/lib/database.js';

async function setupGmailTables() {
  try {
    console.log('📧 Setting up Gmail integration tables...');

    // Create gmail_connections table with improved structure
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_connections (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        gmail_email VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expiry BIGINT,
        scope TEXT DEFAULT 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        status VARCHAR(50) DEFAULT 'connected',
        watch_expiration TIMESTAMP,
        history_id VARCHAR(255),
        user_name VARCHAR(255),
        google_user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gmail_email)
      )
    `);
    console.log('✅ gmail_connections table created/verified');

    // Create gmail_conversations table
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_conversations (
        id SERIAL PRIMARY KEY,
        gmail_connection_id INTEGER NOT NULL REFERENCES gmail_connections(id) ON DELETE CASCADE,
        thread_id VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        subject VARCHAR(1000),
        status VARCHAR(50) DEFAULT 'active',
        is_hot_lead BOOLEAN DEFAULT false,
        hot_lead_score INTEGER DEFAULT 0,
        ai_response_sent BOOLEAN DEFAULT false,
        last_customer_message_at TIMESTAMP,
        last_ai_response_at TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(gmail_connection_id, thread_id)
      )
    `);
    console.log('✅ gmail_conversations table created/verified');

    // Create gmail_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES gmail_conversations(id) ON DELETE CASCADE,
        gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
        thread_id VARCHAR(255) NOT NULL,
        sender_type VARCHAR(50) NOT NULL,
        sender_email VARCHAR(255),
        recipient_email VARCHAR(255),
        subject VARCHAR(1000),
        body_text TEXT,
        body_html TEXT,
        snippet TEXT,
        message_id_header VARCHAR(500),
        in_reply_to VARCHAR(500),
        attachments JSONB,
        gmail_labels JSONB,
        is_ai_response BOOLEAN DEFAULT false,
        ai_model VARCHAR(100),
        ai_response_time_ms INTEGER,
        tokens_used INTEGER,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ gmail_messages table created/verified');

    // Create ai_response_logs table for analytics
    await query(`
      CREATE TABLE IF NOT EXISTS ai_response_logs (
        id SERIAL PRIMARY KEY,
        gmail_connection_id INTEGER REFERENCES gmail_connections(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES gmail_conversations(id) ON DELETE CASCADE,
        customer_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        model_used VARCHAR(100) DEFAULT 'gpt-4o-mini',
        temperature DECIMAL(3,2) DEFAULT 0.7,
        response_time_ms INTEGER,
        tokens_used INTEGER,
        cost_estimate DECIMAL(10,6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ ai_response_logs table created/verified');

    // Create performance indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON gmail_connections(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_connections_email ON gmail_connections(gmail_email)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_connections_status ON gmail_connections(status)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_connection_id ON gmail_conversations(gmail_connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_thread_id ON gmail_conversations(thread_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_customer_email ON gmail_conversations(customer_email)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_is_hot_lead ON gmail_conversations(is_hot_lead)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_messages_conversation_id ON gmail_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_messages_gmail_message_id ON gmail_messages(gmail_message_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread_id ON gmail_messages(thread_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_messages_sender_type ON gmail_messages(sender_type)',
      'CREATE INDEX IF NOT EXISTS idx_ai_response_logs_connection_id ON ai_response_logs(gmail_connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_response_logs_created_at ON ai_response_logs(created_at)'
    ];

    console.log('🔧 Creating performance indexes...');
    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (error) {
        console.log('⚠️ Index might already exist:', error.message);
      }
    }

    // Update email_settings table to support Gmail (if it exists)
    try {
      await query(`
        ALTER TABLE email_settings 
        ADD COLUMN IF NOT EXISTS gmail_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS gmail_auto_response BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS gmail_signature TEXT
      `);
      console.log('✅ Updated email_settings for Gmail support');
    } catch (error) {
      console.log('⚠️ email_settings table might not exist or columns already exist:', error.message);
    }

    // Verify all tables exist and are accessible
    const tablesToCheck = [
      'gmail_connections',
      'gmail_conversations', 
      'gmail_messages',
      'ai_response_logs'
    ];

    const existingTables = [];
    for (const tableName of tablesToCheck) {
      try {
        const result = await query(`SELECT 1 FROM ${tableName} LIMIT 1`);
        existingTables.push(tableName);
        console.log(`✅ Table ${tableName} exists and accessible`);
      } catch (error) {
        console.log(`❌ Table ${tableName} missing or inaccessible:`, error.message);
      }
    }

    console.log('🎉 Gmail integration database setup completed!');

    return {
      success: true,
      message: 'Gmail integration database setup completed successfully',
      details: {
        tablesCreated: existingTables.length,
        totalTables: tablesToCheck.length,
        tables: existingTables,
        features: [
          'Gmail OAuth token storage',
          'Email conversation tracking',
          'AI response logging',
          'Performance analytics',
          'Multi-user support',
          'Thread management',
          'Hot lead detection',
          'Memory + Database hybrid storage'
        ]
      },
      endpoints: {
        setup: 'POST /api/admin/setup-gmail-tables',
        test_connection: 'GET /api/auth/google?test=true',
        monitor_emails: 'POST /api/gmail/monitor',
        status_check: 'GET /api/gmail/status'
      }
    };

  } catch (error) {
    console.error('❌ Gmail database setup error:', error);
    return {
      success: false,
      error: 'Failed to setup Gmail integration tables',
      details: error.message
    };
  }
}

export async function POST() {
  const result = await setupGmailTables();
  return NextResponse.json(result, { 
    status: result.success ? 200 : 500 
  });
}

// Updated GET handler - now actually creates tables instead of just showing info
export async function GET() {
  console.log('📧 GET request received - creating Gmail tables...');
  const result = await setupGmailTables();
  return NextResponse.json(result, { 
    status: result.success ? 200 : 500 
  });
}
