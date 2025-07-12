import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database.js';

export async function POST() {
  try {
    console.log('🔄 Starting database migration...');
    
    const migrationSteps = [];
    
    // Step 1: Check if customers table has clerk_user_id column
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'clerk_user_id'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('Adding clerk_user_id column to customers table...');
        await query('ALTER TABLE customers ADD COLUMN clerk_user_id VARCHAR(255)');
        migrationSteps.push('✅ Added clerk_user_id column to customers table');
      } else {
        migrationSteps.push('✅ clerk_user_id column already exists');
      }
    } catch (error) {
      console.log('Creating customers table...');
      await query(`
        CREATE TABLE customers (
          id SERIAL PRIMARY KEY,
          clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          business_name VARCHAR(255),
          plan VARCHAR(50) DEFAULT 'basic',
          stripe_customer_id VARCHAR(255),
          stripe_subscription_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      migrationSteps.push('✅ Created customers table');
    }
    
    // Step 2: Check and add other missing columns to customers
    const columnsToAdd = [
      { name: 'business_name', type: 'VARCHAR(255)' },
      { name: 'plan', type: 'VARCHAR(50) DEFAULT \'basic\'' },
      { name: 'stripe_customer_id', type: 'VARCHAR(255)' },
      { name: 'stripe_subscription_id', type: 'VARCHAR(255)' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        const columnCheck = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'customers' AND column_name = '${column.name}'
        `);
        
        if (columnCheck.rows.length === 0) {
          await query(`ALTER TABLE customers ADD COLUMN ${column.name} ${column.type}`);
          migrationSteps.push(`✅ Added ${column.name} column to customers table`);
        }
      } catch (error) {
        migrationSteps.push(`⚠️ Could not add ${column.name}: ${error.message}`);
      }
    }
    
    // Step 3: Update conversations table to reference customer_id instead of user_id
    try {
      const conversationCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'customer_id'
      `);
      
      if (conversationCheck.rows.length === 0) {
        await query('ALTER TABLE conversations ADD COLUMN customer_id INTEGER REFERENCES customers(id)');
        migrationSteps.push('✅ Added customer_id column to conversations table');
      }
    } catch (error) {
      migrationSteps.push(`⚠️ Conversations table issue: ${error.message}`);
    }
    
    // Step 4: Create missing tables
    const tablesToCreate = [
      {
        name: 'hot_leads',
        sql: `
          CREATE TABLE IF NOT EXISTS hot_leads (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            conversation_id INTEGER REFERENCES conversations(id),
            urgency_score INTEGER DEFAULT 0,
            keywords TEXT[],
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'new',
            ai_analysis TEXT
          )
        `
      },
      {
        name: 'sms_conversations',
        sql: `
          CREATE TABLE IF NOT EXISTS sms_conversations (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            customer_phone VARCHAR(50) NOT NULL,
            customer_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'sms_messages',
        sql: `
          CREATE TABLE IF NOT EXISTS sms_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES sms_conversations(id),
            sender_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'email_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS email_settings (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            setup_method VARCHAR(100),
            custom_domain VARCHAR(255),
            business_name VARCHAR(255),
            email_address VARCHAR(255),
            ai_personality TEXT,
            tone VARCHAR(100) DEFAULT 'professional',
            expertise VARCHAR(255),
            specialties VARCHAR(255),
            response_style TEXT,
            hot_lead_keywords TEXT[] DEFAULT ARRAY['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
            auto_response_enabled BOOLEAN DEFAULT true,
            alert_hot_leads BOOLEAN DEFAULT true,
            include_availability BOOLEAN DEFAULT false,
            ask_qualifying_questions BOOLEAN DEFAULT false,
            require_approval BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'email_conversations',
        sql: `
          CREATE TABLE IF NOT EXISTS email_conversations (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            contact_email VARCHAR(255) NOT NULL,
            contact_name VARCHAR(255),
            subject VARCHAR(500),
            status VARCHAR(50) DEFAULT 'active',
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'email_messages',
        sql: `
          CREATE TABLE IF NOT EXISTS email_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES email_conversations(id),
            sender_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            subject VARCHAR(500),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];
    
    for (const table of tablesToCreate) {
      try {
        await query(table.sql);
        migrationSteps.push(`✅ Created/verified ${table.name} table`);
      } catch (error) {
        migrationSteps.push(`⚠️ Error with ${table.name} table: ${error.message}`);
      }
    }
    
    // Step 5: Create indexes
    const indexesToCreate = [
      'CREATE INDEX IF NOT EXISTS idx_customers_clerk_user_id ON customers(clerk_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_customer_id ON hot_leads(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_sms_conversations_customer_id ON sms_conversations(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_settings_customer_id ON email_settings(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_conversations_customer_id ON email_conversations(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)'
    ];
    
    for (const indexSql of indexesToCreate) {
      try {
        await query(indexSql);
        migrationSteps.push(`✅ Created index: ${indexSql.split(' ')[5]}`);
      } catch (error) {
        migrationSteps.push(`⚠️ Index creation failed: ${error.message}`);
      }
    }
    
    // Step 6: Add unique constraint to clerk_user_id if it doesn't exist
    try {
      await query('ALTER TABLE customers ADD CONSTRAINT customers_clerk_user_id_unique UNIQUE (clerk_user_id)');
      migrationSteps.push('✅ Added unique constraint to clerk_user_id');
    } catch (error) {
      if (error.message.includes('already exists')) {
        migrationSteps.push('✅ Unique constraint on clerk_user_id already exists');
      } else {
        migrationSteps.push(`⚠️ Could not add unique constraint: ${error.message}`);
      }
    }
    
    console.log('✅ Database migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully!',
      steps: migrationSteps,
      nextSteps: [
        '1. Database schema updated',
        '2. Test your APIs now',
        '3. Check if dashboard loads properly',
        '4. Verify OpenAI connection works'
      ]
    });
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database migration failed',
      details: error.message,
      steps: migrationSteps || []
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to run database migration',
    instructions: [
      '1. Send a POST request to this endpoint',
      '2. Or visit /test-fixes to run migration via UI',
      '3. Check the response for migration results'
    ]
  });
}
