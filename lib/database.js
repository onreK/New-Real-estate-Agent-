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
    console.log('🔧 Starting safe database initialization...');

    // Step 1: Create customers table FIRST (other tables depend on it)
    console.log('📋 Creating customers table...');
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        clerk_user_id VARCHAR(255),
        name VARCHAR(255),
        business_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        plan VARCHAR(50) DEFAULT 'basic',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Step 2: Add missing columns to customers table if they don't exist (safe operation)
    console.log('📋 Adding missing columns to customers table...');
    const customerColumns = [
      { name: 'clerk_user_id', type: 'VARCHAR(255)' },
      { name: 'business_name', type: 'VARCHAR(255)' },
      { name: 'plan', type: 'VARCHAR(50) DEFAULT \'basic\'' },
      { name: 'stripe_customer_id', type: 'VARCHAR(255)' },
      { name: 'stripe_subscription_id', type: 'VARCHAR(255)' }
    ];

    for (const column of customerColumns) {
      try {
        await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`✅ Added/verified column: ${column.name}`);
      } catch (columnError) {
        console.log(`⚠️ Column ${column.name} operation: ${columnError.message}`);
      }
    }

    // Step 3: Create conversations table
    console.log('📋 Creating conversations table...');
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

    // Step 4: Create messages table
    console.log('📋 Creating messages table...');
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

    // Step 5: Create hot_leads table with ALL required columns
    console.log('📋 Creating hot_leads table...');
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

    // Step 6: Add detected_at column if it doesn't exist (for existing hot_leads tables)
    console.log('📋 Ensuring hot_leads has detected_at column...');
    try {
      await query(`ALTER TABLE hot_leads ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ detected_at column verified');
    } catch (detectedAtError) {
      console.log('⚠️ detected_at column operation:', detectedAtError.message);
    }

    // Step 7: Create SMS tables
    console.log('📋 Creating SMS tables...');
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

    // Step 8: Create email tables
    console.log('📋 Creating email tables...');
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

    // Step 9: Create additional config tables
    console.log('📋 Creating config tables...');
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

    // Step 10: Create indexes for performance (safe operations)
    console.log('📋 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_customers_clerk_user_id ON customers(clerk_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_user_id ON hot_leads(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_detected_at ON hot_leads(detected_at)',
      'CREATE INDEX IF NOT EXISTS idx_sms_conversations_user_id ON sms_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_settings_user_id ON email_settings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_conversations_user_id ON email_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_messages_conversation_id ON email_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category)',
      'CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_configs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (indexError) {
        console.log('⚠️ Index operation (may already exist):', indexError.message);
      }
    }

    console.log('✅ Database initialization completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

// CUSTOMER FUNCTIONS - ALL SAFE WITH ERROR HANDLING
export async function getCustomerByClerkId(clerkUserId) {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE clerk_user_id = $1 OR user_id = $1 LIMIT 1',
      [clerkUserId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by Clerk ID:', error);
    return null;
  }
}

export async function createCustomer(customerData) {
  try {
    const { clerk_user_id, email, business_name, plan } = customerData;
    
    const result = await query(
      `INSERT INTO customers (clerk_user_id, user_id, email, business_name, plan) 
       VALUES ($1, $1, $2, $3, $4) 
       RETURNING *`,
      [clerk_user_id, email, business_name || 'My Business', plan || 'basic']
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating customer:', error);
    return null;
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

// STATS FUNCTIONS - SAFE WITH COMPREHENSIVE ERROR HANDLING
export async function getCustomerStats(customerId) {
  try {
    console.log('📊 Getting stats for customer:', customerId);

    // Initialize default stats
    let stats = {
      total_conversations: 0,
      total_messages: 0,
      total_hot_leads: 0,
      hot_leads_today: 0,
      conversations_today: 0,
      messages_today: 0
    };

    // Get conversation count safely
    try {
      const conversationResult = await query(
        `SELECT COUNT(*) as total_conversations 
         FROM conversations 
         WHERE user_id = $1 OR customer_id = $1`,
        [customerId]
      );
      stats.total_conversations = parseInt(conversationResult.rows[0]?.total_conversations) || 0;
    } catch (convError) {
      console.log('⚠️ Conversation count failed, using 0:', convError.message);
    }

    // Get message count safely
    try {
      const messageResult = await query(
        `SELECT COUNT(m.*) as total_messages 
         FROM messages m
         LEFT JOIN conversations c ON m.conversation_id = c.id
         WHERE c.user_id = $1 OR c.customer_id = $1`,
        [customerId]
      );
      stats.total_messages = parseInt(messageResult.rows[0]?.total_messages) || 0;
    } catch (msgError) {
      console.log('⚠️ Message count failed, using 0:', msgError.message);
    }

    // Get hot leads count safely (with error handling for missing detected_at column)
    try {
      const hotLeadsResult = await query(
        `SELECT 
           COUNT(*) as total_hot_leads,
           COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as hot_leads_today
         FROM hot_leads 
         WHERE user_id = $1`,
        [customerId]
      );
      stats.total_hot_leads = parseInt(hotLeadsResult.rows[0]?.total_hot_leads) || 0;
      stats.hot_leads_today = parseInt(hotLeadsResult.rows[0]?.hot_leads_today) || 0;
    } catch (hotLeadsError) {
      console.log('⚠️ Hot leads query failed, using 0:', hotLeadsError.message);
      // If detected_at column doesn't exist, try without the date filter
      try {
        const fallbackResult = await query(
          `SELECT COUNT(*) as total_hot_leads FROM hot_leads WHERE user_id = $1`,
          [customerId]
        );
        stats.total_hot_leads = parseInt(fallbackResult.rows[0]?.total_hot_leads) || 0;
      } catch (fallbackError) {
        console.log('⚠️ Fallback hot leads query also failed:', fallbackError.message);
      }
    }

    console.log('📊 Customer stats retrieved:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting customer stats:', error);
    // Return zero stats on error instead of throwing
    return {
      total_conversations: 0,
      total_messages: 0,
      total_hot_leads: 0,
      hot_leads_today: 0,
      conversations_today: 0,
      messages_today: 0
    };
  }
}

// CONVERSATION FUNCTIONS - SAFE WITH ERROR HANDLING
export async function getConversationsByCustomer(customerId, limit = 50) {
  try {
    const result = await query(
      `SELECT c.*, cu.name as customer_name, cu.email as customer_email,
              COUNT(m.id) as message_count,
              MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN customers cu ON c.customer_id = cu.id
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1 OR c.customer_id = $1
       GROUP BY c.id, cu.name, cu.email
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $2`,
      [customerId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting customer conversations:', error);
    return [];
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

// MESSAGE FUNCTIONS
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

// HOT LEADS FUNCTIONS - SAFE WITH ERROR HANDLING
export async function getHotLeadsByCustomer(customerId, limit = 50) {
  try {
    const result = await query(
      `SELECT hl.*, c.name as customer_name, c.email as customer_email
       FROM hot_leads hl
       LEFT JOIN customers c ON hl.customer_id = c.id
       WHERE hl.user_id = $1
       ORDER BY COALESCE(hl.detected_at, hl.created_at) DESC NULLS LAST
       LIMIT $2`,
      [customerId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting hot leads by customer:', error);
    return [];
  }
}

export async function createHotLead(userId, customerId, conversationId, urgencyScore, keywords = [], aiAnalysis = '') {
  try {
    const result = await query(
      `INSERT INTO hot_leads (user_id, customer_id, conversation_id, urgency_score, keywords, ai_analysis, detected_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [userId, customerId, conversationId, urgencyScore, keywords, aiAnalysis]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating hot lead:', error);
    return null;
  }
}

// DATABASE CLIENT ACCESS
export function getDbClient() {
  return pool;
}

export default pool;
