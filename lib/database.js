import { Client } from 'pg';

// Database connection helper
let client = null;

export async function getDbClient() {
  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    await client.connect();
  }
  return client;
}

// Initialize database tables
export async function initializeDatabase() {
  const client = await getDbClient();
  
  try {
    console.log('🗄️ Creating database tables...');

    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        clerk_user_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        plan VARCHAR(50) DEFAULT 'basic',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        trial_ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create phone_numbers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        twilio_sid VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        monthly_cost DECIMAL(10,2) DEFAULT 1.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create ai_configs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_configs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) REFERENCES phone_numbers(phone_number),
        business_name VARCHAR(255) NOT NULL,
        personality VARCHAR(50) DEFAULT 'professional',
        business_info TEXT,
        welcome_message TEXT,
        model VARCHAR(50) DEFAULT 'gpt-4o-mini',
        creativity DECIMAL(3,2) DEFAULT 0.7,
        response_length VARCHAR(20) DEFAULT 'medium',
        knowledge_base TEXT,
        
        -- Hot Lead Settings
        enable_hot_lead_alerts BOOLEAN DEFAULT true,
        business_owner_phone VARCHAR(20),
        alert_business_hours BOOLEAN DEFAULT true,
        hot_lead_threshold INTEGER DEFAULT 7,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        conversation_key VARCHAR(255) UNIQUE NOT NULL,
        source VARCHAR(20) NOT NULL, -- 'web_chat' or 'sms'
        from_number VARCHAR(20), -- For SMS conversations
        to_number VARCHAR(20), -- For SMS conversations
        lead_captured BOOLEAN DEFAULT false,
        lead_source VARCHAR(20),
        hot_lead_score INTEGER DEFAULT 0,
        visitor_info JSONB, -- Store web chat visitor data
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sender_type VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
        direction VARCHAR(20), -- 'inbound', 'outbound' for SMS
        from_number VARCHAR(20), -- For SMS
        to_number VARCHAR(20), -- For SMS
        model_used VARCHAR(50), -- AI model used for response
        hot_lead_score INTEGER DEFAULT 0,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create hot_lead_alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hot_lead_alerts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        business_owner_phone VARCHAR(20) NOT NULL,
        lead_score INTEGER NOT NULL,
        lead_phone VARCHAR(20),
        message_content TEXT NOT NULL,
        ai_reasoning TEXT,
        next_action TEXT,
        urgency VARCHAR(20),
        source VARCHAR(20) NOT NULL, -- 'web_chat' or 'sms'
        alert_sent BOOLEAN DEFAULT false,
        twilio_message_sid VARCHAR(255),
        alert_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        source VARCHAR(20) NOT NULL, -- 'web_chat' or 'sms'
        contact_info JSONB, -- Phone, email, name if collected
        lead_score INTEGER DEFAULT 0,
        qualification_status VARCHAR(50) DEFAULT 'new', -- 'new', 'qualified', 'nurturing', 'converted', 'dead'
        notes TEXT,
        assigned_to VARCHAR(255),
        follow_up_date TIMESTAMP,
        converted_at TIMESTAMP,
        conversion_value DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create usage_logs table for billing
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        usage_type VARCHAR(50) NOT NULL, -- 'web_chat_message', 'sms_message', 'hot_lead_alert'
        quantity INTEGER DEFAULT 1,
        cost DECIMAL(10,4) DEFAULT 0,
        metadata JSONB, -- Store additional usage data
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_hot_lead_alerts_customer_id ON hot_lead_alerts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_hot_lead_alerts_created_at ON hot_lead_alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_customer_id ON usage_logs(customer_id);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
    `);

    console.log('✅ Database tables created successfully!');
    return { success: true, message: 'Database initialized successfully' };

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Helper functions for common database operations
export async function createCustomer(customerData) {
  const client = await getDbClient();
  const { clerk_user_id, email, business_name, plan = 'basic' } = customerData;
  
  const result = await client.query(`
    INSERT INTO customers (clerk_user_id, email, business_name, plan)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [clerk_user_id, email, business_name, plan]);
  
  return result.rows[0];
}

export async function getCustomerById(customerId) {
  const client = await getDbClient();
  const result = await client.query(`
    SELECT * FROM customers WHERE id = $1
  `, [customerId]);
  
  return result.rows[0];
}

export async function getCustomerByClerkId(clerkUserId) {
  const client = await getDbClient();
  const result = await client.query(`
    SELECT * FROM customers WHERE clerk_user_id = $1
  `, [clerkUserId]);
  
  return result.rows[0];
}

export async function createConversation(conversationData) {
  const client = await getDbClient();
  const { 
    customer_id, 
    conversation_key, 
    source, 
    from_number, 
    to_number, 
    visitor_info = null 
  } = conversationData;
  
  const result = await client.query(`
    INSERT INTO conversations (customer_id, conversation_key, source, from_number, to_number, visitor_info)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [customer_id, conversation_key, source, from_number, to_number, visitor_info]);
  
  return result.rows[0];
}

export async function getConversationByKey(conversationKey) {
  const client = await getDbClient();
  const result = await client.query(`
    SELECT * FROM conversations WHERE conversation_key = $1
  `, [conversationKey]);
  
  return result.rows[0];
}

export async function createMessage(messageData) {
  const client = await getDbClient();
  const { 
    conversation_id, 
    customer_id, 
    content, 
    sender_type, 
    direction, 
    from_number, 
    to_number, 
    model_used, 
    hot_lead_score = 0,
    processing_time_ms 
  } = messageData;
  
  const result = await client.query(`
    INSERT INTO messages (
      conversation_id, customer_id, content, sender_type, direction, 
      from_number, to_number, model_used, hot_lead_score, processing_time_ms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    conversation_id, customer_id, content, sender_type, direction,
    from_number, to_number, model_used, hot_lead_score, processing_time_ms
  ]);
  
  return result.rows[0];
}

export async function getConversationMessages(conversationId, limit = 50) {
  const client = await getDbClient();
  const result = await client.query(`
    SELECT * FROM messages 
    WHERE conversation_id = $1 
    ORDER BY created_at ASC 
    LIMIT $2
  `, [conversationId, limit]);
  
  return result.rows;
}

export async function createHotLeadAlert(alertData) {
  const client = await getDbClient();
  const { 
    customer_id, 
    conversation_id, 
    message_id, 
    business_owner_phone, 
    lead_score, 
    lead_phone, 
    message_content, 
    ai_reasoning, 
    next_action, 
    urgency, 
    source 
  } = alertData;
  
  const result = await client.query(`
    INSERT INTO hot_lead_alerts (
      customer_id, conversation_id, message_id, business_owner_phone, 
      lead_score, lead_phone, message_content, ai_reasoning, next_action, urgency, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    customer_id, conversation_id, message_id, business_owner_phone,
    lead_score, lead_phone, message_content, ai_reasoning, next_action, urgency, source
  ]);
  
  return result.rows[0];
}

export async function getCustomerAnalytics(customerId, timeframe = '30 days') {
  const client = await getDbClient();
  
  // Get conversation stats
  const conversationStats = await client.query(`
    SELECT 
      source,
      COUNT(*) as total_conversations,
      COUNT(CASE WHEN lead_captured = true THEN 1 END) as leads_generated
    FROM conversations 
    WHERE customer_id = $1 
    AND created_at >= NOW() - INTERVAL '${timeframe}'
    GROUP BY source
  `, [customerId]);
  
  // Get message stats
  const messageStats = await client.query(`
    SELECT 
      COUNT(*) as total_messages,
      AVG(hot_lead_score) as avg_lead_score,
      COUNT(CASE WHEN hot_lead_score >= 7 THEN 1 END) as hot_leads
    FROM messages 
    WHERE customer_id = $1 
    AND created_at >= NOW() - INTERVAL '${timeframe}'
  `, [customerId]);
  
  // Get hot lead alert stats
  const alertStats = await client.query(`
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(CASE WHEN alert_sent = true THEN 1 END) as alerts_sent,
      AVG(lead_score) as avg_alert_score
    FROM hot_lead_alerts 
    WHERE customer_id = $1 
    AND created_at >= NOW() - INTERVAL '${timeframe}'
  `, [customerId]);
  
  return {
    conversations: conversationStats.rows,
    messages: messageStats.rows[0],
    alerts: alertStats.rows[0]
  };
}

// Cleanup function
export async function closeDbConnection() {
  if (client) {
    await client.end();
    client = null;
  }
}
