import { query } from '@/lib/database.js';

export async function POST() {
  try {
    console.log('Starting database update...');

    const emailSettingsUpdates = [
      { name: 'ai_enabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'ai_model', type: 'VARCHAR(100) DEFAULT \'gpt-4o-mini\'' },
      { name: 'ai_temperature', type: 'DECIMAL(3,2) DEFAULT 0.7' },
      { name: 'ai_system_prompt', type: 'TEXT' },
    ];

    console.log('Adding missing columns to email_settings...');
    for (const column of emailSettingsUpdates) {
      try {
        await query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`✅ Added column ${column.name} to email_settings`);
      } catch (error) {
        console.log(`⚠️ Column ${column.name} might already exist in email_settings:`, error.message);
      }
    }

    console.log('Creating email_templates table...');
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

    console.log('Creating email_conversations table...');
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

    console.log('Creating email_messages table...');
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

    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)',
      'CREATE INDEX IF NOT EXISTS idx_email_conversations_user_id ON email_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (error) {
        console.log('⚠️ Index might already exist:', error.message);
      }
    }

    console.log('Verifying table existence...');
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
      'business_profiles'
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

    console.log('Database update completed successfully!');

    return Response.json({ 
      success: true, 
      message: 'Database updated successfully',
      details: {
        tablesVerified: existingTables.length,
        totalTables: tablesToCheck.length,
        existingTables
      }
    });

  } catch (error) {
    console.error('Database update failed:', error);
    return Response.json({ 
      success: false, 
      error: 'Database update failed',
      details: error.message 
    }, { status: 500 });
  }
}
