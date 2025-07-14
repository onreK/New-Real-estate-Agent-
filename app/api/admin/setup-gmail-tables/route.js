import { NextResponse } from 'next/server';
import { getDbClient } from '../../../../lib/database.js';

export async function POST() {
  try {
    console.log('📧 Setting up Gmail integration tables...');

    const client = await getDbClient();
    try {
      // Create gmail_connections table
      await client.query(`
        CREATE TABLE IF NOT EXISTS gmail_connections (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          gmail_email VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expiry TIMESTAMP,
          status VARCHAR(50) DEFAULT 'connected',
          watch_expiration TIMESTAMP,
          history_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(customer_id)
        )
      `);
      console.log('✅ gmail_connections table created');

      // Create gmail_conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS gmail_conversations (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          gmail_connection_id INTEGER NOT NULL REFERENCES gmail_connections(id) ON DELETE CASCADE,
          thread_id VARCHAR(255) NOT NULL,
          gmail_message_id VARCHAR(255) NOT NULL,
          sender_email VARCHAR(255) NOT NULL,
          sender_name VARCHAR(255),
          subject VARCHAR(1000),
          snippet TEXT,
          status VARCHAR(50) DEFAULT 'active',
          is_hot_lead BOOLEAN DEFAULT false,
          hot_lead_score INTEGER DEFAULT 0,
          ai_response_sent BOOLEAN DEFAULT false,
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ gmail_conversations table created');

      // Create gmail_messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS gmail_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES gmail_conversations(id) ON DELETE CASCADE,
          gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
          thread_id VARCHAR(255) NOT NULL,
          sender_type VARCHAR(50) NOT NULL, -- 'customer' or 'ai'
          sender_email VARCHAR(255),
          subject VARCHAR(1000),
          body_text TEXT,
          body_html TEXT,
          attachments JSONB,
          gmail_labels JSONB,
          is_ai_response BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ gmail_messages table created');

      // Create indexes for performance
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_gmail_connections_customer_id ON gmail_connections(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_customer_id ON gmail_conversations(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_thread_id ON gmail_conversations(thread_id)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_is_hot_lead ON gmail_conversations(is_hot_lead)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_messages_conversation_id ON gmail_messages(conversation_id)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_messages_gmail_message_id ON gmail_messages(gmail_message_id)',
        'CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread_id ON gmail_messages(thread_id)'
      ];

      for (const indexQuery of indexes) {
        try {
          await client.query(indexQuery);
          console.log('✅ Index created');
        } catch (error) {
          console.log('⚠️ Index might already exist:', error.message);
        }
      }

      // Update email_settings table to support Gmail
      try {
        await client.query(`
          ALTER TABLE email_settings 
          ADD COLUMN IF NOT EXISTS gmail_enabled BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS gmail_auto_response BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS gmail_signature TEXT
        `);
        console.log('✅ Updated email_settings for Gmail support');
      } catch (error) {
        console.log('⚠️ email_settings columns might already exist:', error.message);
      }

      console.log('🎉 Gmail integration tables setup completed!');

      return NextResponse.json({
        success: true,
        message: 'Gmail integration database setup completed',
        tables: [
          'gmail_connections',
          'gmail_conversations', 
          'gmail_messages'
        ]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Gmail database setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to setup Gmail integration tables',
      details: error.message
    }, { status: 500 });
  }
}
