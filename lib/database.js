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

// Export the pool client for direct access when needed
export function getDbClient() {
  return pool;
}

// CRITICAL MISSING FUNCTION - This is the main cause of your errors
export async function getCustomerByClerkId(clerkUserId) {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE clerk_user_id = $1',
      [clerkUserId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by Clerk ID:', error);
    return null;
  }
}

// Create customer function - also missing
export async function createCustomer(customerData) {
  try {
    const { clerk_user_id, email, business_name, plan } = customerData;
    
    const result = await query(
      `INSERT INTO customers (clerk_user_id, email, business_name, plan, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [clerk_user_id, email, business_name, plan]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Get customer stats - missing function
export async function getCustomerStats(customerId) {
  try {
    // Get conversation stats
    const conversationResult = await query(
      'SELECT COUNT(*) as total_conversations FROM conversations WHERE customer_id = $1',
      [customerId]
    );
    
    // Get message stats
    const messageResult = await query(
      `SELECT COUNT(m.*) as total_messages 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE c.customer_id = $1`,
      [customerId]
    );
    
    // Get hot leads stats
    const hotLeadsResult = await query(
      'SELECT COUNT(*) as hot_leads_today FROM hot_leads WHERE customer_id = $1 AND DATE(detected_at) = CURRENT_DATE',
      [customerId]
    );
    
    // Get SMS stats
    const smsResult = await query(
      'SELECT COUNT(*) as sms_conversations FROM sms_conversations WHERE customer_id = $1',
      [customerId]
    );
    
    // Get email stats if email_conversations table exists
    let emailStats = { email_conversations: 0, email_messages: 0 };
    try {
      const emailResult = await query(
        'SELECT COUNT(*) as email_conversations FROM email_conversations WHERE customer_id = $1',
        [customerId]
      );
      emailStats.email_conversations = parseInt(emailResult.rows[0].email_conversations);
      
      const emailMsgResult = await query(
        `SELECT COUNT(em.*) as email_messages 
         FROM email_messages em 
         JOIN email_conversations ec ON em.conversation_id = ec.id 
         WHERE ec.customer_id = $1`,
        [customerId]
      );
      emailStats.email_messages = parseInt(emailMsgResult.rows[0].email_messages);
    } catch (emailError) {
      console.log('Email tables not found, skipping email stats');
    }
    
    return {
      totalConversations: parseInt(conversationResult.rows[0].total_conversations),
      totalMessages: parseInt(messageResult.rows[0].total_messages),
      hotLeadsToday: parseInt(hotLeadsResult.rows[0].hot_leads_today),
      smsConversations: parseInt(smsResult.rows[0].sms_conversations),
      ...emailStats
    };
  } catch (error) {
    console.error('Error getting customer stats:', error);
    return {
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0,
      smsConversations: 0,
      email_conversations: 0,
      email_messages: 0
    };
  }
}

// Get conversations by customer - missing function
export async function getConversationsByCustomer(customerId) {
  try {
    const result = await query(
      `SELECT c.*, COUNT(m.id) as message_count, MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.customer_id = $1
       GROUP BY c.id
       ORDER BY last_message_at DESC NULLS LAST`,
      [customerId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting conversations by customer:', error);
    return [];
  }
}

// Get hot leads by customer - missing function
export async function getHotLeadsByCustomer(customerId) {
  try {
    const result = await query(
      `SELECT hl.*, c.type as conversation_type 
       FROM hot_leads hl
       LEFT JOIN conversations c ON hl.conversation_id = c.id
       WHERE hl.customer_id = $1
       ORDER BY hl.detected_at DESC`,
      [customerId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting hot leads by customer:', error);
    return [];
  }
}

// SMS functions - missing
export async function getSmsConversationsByCustomer(customerId) {
  try {
    const result = await query(
      `SELECT sc.*, COUNT(sm.id) as message_count, MAX(sm.created_at) as last_message_at
       FROM sms_conversations sc
       LEFT JOIN sms_messages sm ON sc.id = sm.conversation_id
       WHERE sc.customer_id = $1
       GROUP BY sc.id
       ORDER BY last_message_at DESC NULLS LAST`,
      [customerId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting SMS conversations by customer:', error);
    return [];
  }
}

export async function getSmsMessagesByCustomer(customerId) {
  try {
    const result = await query(
      `SELECT sm.* 
       FROM sms_messages sm
       JOIN sms_conversations sc ON sm.conversation_id = sc.id
       WHERE sc.customer_id = $1
       ORDER BY sm.created_at DESC`,
      [customerId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting SMS messages by customer:', error);
    return [];
  }
}

// Email functions - missing
export async function getEmailMessages(conversationId) {
  try {
    const result = await query(
      'SELECT * FROM email_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting email messages:', error);
    return [];
  }
}

// Initialize database with proper schema
export async function initializeDatabase() {
  try {
    // Updated customers table with clerk_user_id
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
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

    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
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
        customer_id INTEGER REFERENCES customers(id),
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
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
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
    `);

    await query(`
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
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES email_conversations(id),
        sender_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        subject VARCHAR(500),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_clerk_user_id ON customers(clerk_user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hot_leads_customer_id ON hot_leads(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_conversations_customer_id ON sms_conversations(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_settings_customer_id ON email_settings(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_conversations_customer_id ON email_conversations(customer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)`);

    console.log('✅ Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return { success: false, error: error.message };
  }
}

// Legacy functions for backward compatibility
export async function getCustomerByEmail(userId, email) {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE clerk_user_id = $1 AND email = $2',
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
         SET business_name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [name || existing.business_name, existing.id]
      );
      return result.rows[0];
    } else {
      const result = await query(
        `INSERT INTO customers (clerk_user_id, business_name, email) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [userId, name, email]
      );
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    return null;
  }
}

export async function createConversation(customerId, type = 'general') {
  try {
    const result = await query(
      `INSERT INTO conversations (customer_id, type) 
       VALUES ($1, $2) 
       RETURNING *`,
      [customerId, type]
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

export async function getUserConversations(customerId, limit = 50) {
  try {
    const result = await query(
      `SELECT c.*, COUNT(m.id) as message_count,
              MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.customer_id = $1
       GROUP BY c.id
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $2`,
      [customerId, limit]
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

// Export the pool as default for backwards compatibility
export default pool;
