// lib/database.js
// COMPLETE REPLACEMENT - Fixed version with no build-time connection tests
import pkg from 'pg';
const { Pool } = pkg;

// Enhanced connection configuration for Railway internal networking
function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  
  // Check if using Railway internal URL
  if (connectionString && connectionString.includes('.railway.internal')) {
    console.log('🚂 Configuring for Railway internal networking...');
    
    // Parse the internal connection string
    const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (match) {
      const [, user, password, host, port, database] = match;
      
      return {
        user,
        password,
        host,
        port: parseInt(port, 10),
        database,
        // CRITICAL: No SSL for internal connections
        ssl: false,
        // Increase timeouts for internal networking
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        query_timeout: 30000,
        statement_timeout: 30000,
        // Connection pool settings
        max: 20,
        min: 2,
        // Keep alive settings
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      };
    }
  }
  
  // Fallback to standard configuration for external URLs
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

// Create pool with proper configuration
const pool = new Pool(getPoolConfig());

// Add connection error handler
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// REMOVED BUILD-TIME CONNECTION TEST - This was causing your errors!
// Connection will be tested when first query is made at runtime

// Enhanced query function with retry logic for internal networking
export async function query(text, params) {
  const maxRetries = 3;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      
      // Enhanced error logging for better debugging
      if (error.code === 'ENOTFOUND') {
        console.error(`❌ Database host not found (attempt ${i + 1}/${maxRetries})`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Database connection refused (attempt ${i + 1}/${maxRetries})`);
      } else if (error.code === '28P01') {
        console.error(`❌ Database authentication failed`);
      } else if (i === 0) {
        // Only log the error details on first attempt to avoid spam
        console.log(`⚠️ Query attempt ${i + 1} failed: ${error.message}`);
      }
      
      // Only retry on connection errors
      if (i < maxRetries - 1 && (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Export the pool for direct access if needed
export function getDbClient() {
  return pool;
}

// ============ DATABASE INITIALIZATION ============
export async function initializeDatabase() {
  try {
    console.log('🔧 Starting safe database initialization...');

    // Step 1: Create customers table with all required columns
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        clerk_user_id VARCHAR(255) UNIQUE,
        user_id VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        business_name VARCHAR(255),
        phone VARCHAR(50),
        plan VARCHAR(50) DEFAULT 'starter',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table ready');

    // Step 2: Create hot_leads table with detected_at
    await query(`
      CREATE TABLE IF NOT EXISTS hot_leads (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        lead_name VARCHAR(255),
        lead_email VARCHAR(255),
        lead_phone VARCHAR(50),
        lead_source VARCHAR(50),
        lead_channel VARCHAR(50),
        intent_signals TEXT[],
        interest_level VARCHAR(50),
        last_interaction TIMESTAMP,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        follow_up_status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Hot leads table ready');

    // Step 3: Create gmail_connections table
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_connections (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        gmail_email VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        status VARCHAR(50) DEFAULT 'connected',
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gmail_email)
      )
    `);
    console.log('✅ Gmail connections table ready');

    // Step 4: Create gmail_conversations table
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_conversations (
        id SERIAL PRIMARY KEY,
        gmail_connection_id INTEGER REFERENCES gmail_connections(id) ON DELETE CASCADE,
        thread_id VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        subject TEXT,
        last_customer_message TEXT,
        last_customer_message_at TIMESTAMP,
        ai_response_generated BOOLEAN DEFAULT false,
        ai_response TEXT,
        ai_responded_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(gmail_connection_id, thread_id)
      )
    `);
    console.log('✅ Gmail conversations table ready');

    // Step 5: Create gmail_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS gmail_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES gmail_conversations(id) ON DELETE CASCADE,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        sender_email VARCHAR(255),
        sender_name VARCHAR(255),
        recipient_email VARCHAR(255),
        subject TEXT,
        body_text TEXT,
        body_html TEXT,
        is_ai_generated BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        received_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Gmail messages table ready');

    // Step 6: Create ai_analytics_events table
    await query(`
      CREATE TABLE IF NOT EXISTS ai_analytics_events (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_value NUMERIC,
        event_data JSONB,
        channel VARCHAR(50),
        metadata JSONB,
        user_message TEXT,
        ai_response TEXT,
        confidence_score NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AI analytics events table ready');

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_clerk_user_id ON customers(clerk_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_customer_id ON hot_leads(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_detected_at ON hot_leads(detected_at)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_connections_customer_id ON gmail_connections(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_conversations_connection_id ON gmail_conversations(gmail_connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_gmail_messages_conversation_id ON gmail_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_analytics_customer_id ON ai_analytics_events(customer_id)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
      } catch (indexError) {
        // Index might already exist, that's OK
        console.log('⚠️ Index operation:', indexError.message);
      }
    }

    console.log('✅ Database initialization completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

// ============ CUSTOMER FUNCTIONS ============
export async function getCustomerByClerkId(clerkUserId) {
  try {
    const result = await query(
      'SELECT * FROM customers WHERE clerk_user_id = $1',
      [clerkUserId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Fallback: try user_id for backward compatibility
    const userResult = await query(
      'SELECT * FROM customers WHERE user_id = $1',
      [clerkUserId]
    );
    
    return userResult.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting customer by Clerk ID:', error);
    return null;
  }
}

export async function createCustomer(customerData) {
  try {
    const { clerk_user_id, email, business_name, plan } = customerData;
    
    // Check if customer already exists
    const existing = await getCustomerByClerkId(clerk_user_id);
    if (existing) {
      console.log('⚠️ Customer already exists:', existing.id);
      return existing;
    }
    
    const result = await query(`
      INSERT INTO customers (clerk_user_id, email, business_name, plan, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        clerk_user_id = EXCLUDED.clerk_user_id,
        business_name = EXCLUDED.business_name,
        plan = EXCLUDED.plan,
        updated_at = NOW()
      RETURNING *
    `, [clerk_user_id, email, business_name, plan || 'starter']);
    
    console.log('✅ Customer created/updated:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    throw error;
  }
}

export async function updateCustomer(customerId, updates) {
  try {
    const { business_name, phone, plan, status } = updates;
    
    const result = await query(`
      UPDATE customers 
      SET business_name = COALESCE($2, business_name),
          phone = COALESCE($3, phone),
          plan = COALESCE($4, plan),
          status = COALESCE($5, status),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [customerId, business_name, phone, plan, status]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating customer:', error);
    throw error;
  }
}

// ============ HOT LEADS FUNCTIONS ============
export async function createHotLead(leadData) {
  try {
    const {
      customer_id,
      lead_name,
      lead_email,
      lead_phone,
      lead_source,
      lead_channel,
      intent_signals,
      interest_level,
      notes,
      metadata
    } = leadData;
    
    const result = await query(`
      INSERT INTO hot_leads (
        customer_id, lead_name, lead_email, lead_phone, 
        lead_source, lead_channel, intent_signals, interest_level,
        notes, metadata, detected_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
      RETURNING *
    `, [
      customer_id, lead_name, lead_email, lead_phone,
      lead_source, lead_channel, intent_signals, interest_level,
      notes, metadata
    ]);
    
    console.log('🔥 Hot lead created:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating hot lead:', error);
    throw error;
  }
}

export async function getHotLeads(customerId, limit = 50) {
  try {
    const result = await query(`
      SELECT * FROM hot_leads 
      WHERE customer_id = $1 
      ORDER BY detected_at DESC 
      LIMIT $2
    `, [customerId, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting hot leads:', error);
    return [];
  }
}

export async function updateHotLeadStatus(leadId, status, notes) {
  try {
    const result = await query(`
      UPDATE hot_leads 
      SET follow_up_status = $2, 
          notes = COALESCE($3, notes),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [leadId, status, notes]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating hot lead:', error);
    throw error;
  }
}

// ============ STATS AND ANALYTICS ============
export async function getCustomerStats(customerId) {
  try {
    const stats = {};
    
    // Get hot leads count
    const leadsResult = await query(
      'SELECT COUNT(*) as count FROM hot_leads WHERE customer_id = $1',
      [customerId]
    );
    stats.totalLeads = parseInt(leadsResult.rows[0].count);
    
    // Get recent leads (last 7 days)
    const recentResult = await query(`
      SELECT COUNT(*) as count 
      FROM hot_leads 
      WHERE customer_id = $1 
      AND detected_at > NOW() - INTERVAL '7 days'
    `, [customerId]);
    stats.recentLeads = parseInt(recentResult.rows[0].count);
    
    // Get leads by channel
    const channelResult = await query(`
      SELECT lead_channel, COUNT(*) as count 
      FROM hot_leads 
      WHERE customer_id = $1 
      GROUP BY lead_channel
    `, [customerId]);
    stats.leadsByChannel = channelResult.rows;
    
    // Get AI interactions count
    const aiResult = await query(
      'SELECT COUNT(*) as count FROM ai_analytics_events WHERE customer_id = $1',
      [customerId]
    );
    stats.aiInteractions = parseInt(aiResult.rows[0].count);
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting customer stats:', error);
    return {
      totalLeads: 0,
      recentLeads: 0,
      leadsByChannel: [],
      aiInteractions: 0
    };
  }
}

// ============ AI ANALYTICS ============
export async function logAIEvent(eventData) {
  try {
    const {
      customer_id,
      event_type,
      event_value,
      event_data,
      channel,
      metadata,
      user_message,
      ai_response,
      confidence_score
    } = eventData;
    
    const result = await query(`
      INSERT INTO ai_analytics_events (
        customer_id, event_type, event_value, event_data,
        channel, metadata, user_message, ai_response, 
        confidence_score, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      customer_id, event_type, event_value, event_data,
      channel, metadata, user_message, ai_response, confidence_score
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error logging AI event:', error);
    throw error;
  }
}

// ============ EMAIL/GMAIL FUNCTIONS - RE-EXPORT FROM gmail-database.js ============
// Import all email-related functions from gmail-database.js
import {
  saveGmailConnection,
  getGmailConnection,
  getAllGmailConnections,
  updateGmailTokens,
  disconnectGmail,
  saveEmailConversation,
  getEmailConversations,
  saveEmailMessage,
  getEmailMessages as getGmailMessages,
  updateConversationStatus,
  getConnectionStats,
  getRecentConversations
} from './gmail-database.js';

// Re-export with consistent naming
export {
  saveGmailConnection,
  getGmailConnection,
  getAllGmailConnections,
  updateGmailTokens,
  disconnectGmail,
  saveEmailConversation,
  getEmailConversations,
  saveEmailMessage,
  updateConversationStatus,
  getConnectionStats,
  getRecentConversations
};

// Export with alternative names for compatibility
export const getEmailMessages = getGmailMessages;
export const getEmailConnections = getAllGmailConnections;

// ============ UTILITY FUNCTIONS ============
export async function checkDatabaseConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    return { 
      connected: true, 
      timestamp: result.rows[0].current_time 
    };
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return { 
      connected: false, 
      error: error.message 
    };
  }
}
