import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        type VARCHAR(50) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        sender_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS hot_leads (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        conversation_id INTEGER REFERENCES conversations(id),
        urgency_score INTEGER DEFAULT 0,
        keywords TEXT[],
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'new',
        ai_analysis TEXT
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sms_conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES sms_conversations(id),
        sender_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        twilio_sid VARCHAR(255),
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        provider VARCHAR(50),
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_username VARCHAR(255),
        smtp_password TEXT,
        imap_host VARCHAR(255),
        imap_port INTEGER,
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        auto_response_enabled BOOLEAN DEFAULT false,
        ai_enabled BOOLEAN DEFAULT false,
        ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
        ai_temperature DECIMAL(3,2) DEFAULT 0.7,
        ai_system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    await query(`
      CREATE TABLE IF NOT EXISTS ai_configs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        openai_api_key TEXT,
        model VARCHAR(100) DEFAULT 'gpt-4o-mini',
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 1000,
        system_prompt TEXT,
        auto_response_enabled BOOLEAN DEFAULT false,
        lead_detection_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        business_name VARCHAR(255),
        industry VARCHAR(100),
        description TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255),
        address TEXT,
        business_hours JSONB,
        services TEXT[],
        target_audience TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hot_leads_user_id ON hot_leads(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_conversations_user_id ON sms_conversations(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_settings_user_id ON email_settings(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_conversations_user_id ON email_conversations(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_configs(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id)`);

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

export async function addMissingColumns() {
  try {
    const emailSettingsColumns = [
      { name: 'ai_enabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'ai_model', type: 'VARCHAR(100) DEFAULT \'gpt-4o-mini\'' },
      { name: 'ai_temperature', type: 'DECIMAL(3,2) DEFAULT 0.7' },
      { name: 'ai_system_prompt', type: 'TEXT' },
    ];

    for (const column of emailSettingsColumns) {
      try {
        await query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
      } catch (error) {
        console.log(`Column ${column.name} might already exist in email_settings`);
      }
    }

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

    await query(`CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)`);

    console.log('Missing columns added successfully');
    return { success: true };
  } catch (error) {
    console.error('Error adding missing columns:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerByEmail(userId, email) {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE user_id = $1 AND email = $2',
      [userId, email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    return null;
  }
}

export async function createOrUpdateCustomer(userId, customerData) {
  try {
    const { name, email, phone, source } = customerData;
    
    const existing = await getCustomerByEmail(userId, email);
    
    if (existing) {
      const result = await query(
        `UPDATE customers 
         SET name = $1, phone = $2, source = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING *`,
        [name || existing.name, phone || existing.phone, source || existing.source, existing.id]
      );
      return result.rows[0];
    } else {
      const result = await query(
        `INSERT INTO customers (user_id, name, email, phone, source) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [userId, name, email, phone, source]
      );
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    return null;
  }
}

export async function createConversation(userId, customerId, type = 'general') {
  try {
    const result = await query(
      `INSERT INTO conversations (user_id, customer_id, type) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userId, customerId, type]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
}

export async function addMessage(conversationId, senderType, content, metadata = null) {
  try {
    const result = await query(
      `INSERT INTO messages (conversation_id, sender_type, content, metadata) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [conversationId, senderType, content, metadata]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding message:', error);
    return null;
  }
}

export async function getUserConversations(userId, limit = 50) {
  try {
    const result = await query(
      `SELECT c.*, cu.name as customer_name, cu.email as customer_email,
              COUNT(m.id) as message_count,
              MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN customers cu ON c.customer_id = cu.id
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1
       GROUP BY c.id, cu.name, cu.email
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
}

export async function getConversationMessages(conversationId, limit = 100) {
  try {
    const result = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return [];
  }
}

export default pool;
