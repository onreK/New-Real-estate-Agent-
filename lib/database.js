import { Pool } from 'pg';

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection and initialize tables
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create customers table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        clerk_user_id VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        business_name VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'basic',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create conversations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        conversation_key VARCHAR(255),
        channel VARCHAR(50) DEFAULT 'web',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        sender VARCHAR(50),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create hot_leads table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS hot_leads (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        customer_id INTEGER REFERENCES customers(id),
        trigger_message TEXT,
        keywords_matched TEXT[],
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sms_conversations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_conversations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        customer_phone VARCHAR(20),
        business_phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sms_messages table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES sms_conversations(id),
        sender VARCHAR(50),
        content TEXT,
        twilio_sid VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    client.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Initialize database on import
initializeDatabase();

// Get database client (for compatibility)
export function getDbClient() {
  return pool;
}

// ==============
// CUSTOMER FUNCTIONS
// ==============

export async function createCustomer(customerData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO customers (clerk_user_id, email, business_name, plan)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      customerData.clerk_user_id,
      customerData.email || '',
      customerData.business_name || customerData.name || 'My Business',
      customerData.plan || 'basic'
    ];
    
    const result = await client.query(query, values);
    console.log('✅ Customer created in Postgres:', result.rows[0]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getCustomerByClerkId(clerkUserId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM customers WHERE clerk_user_id = $1';
    const result = await client.query(query, [clerkUserId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getCustomerById(customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await client.query(query, [customerId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getAllCustomers() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM customers ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

// ==============
// CONVERSATION FUNCTIONS
// ==============

export async function createConversation(conversationData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO conversations (customer_id, conversation_key, channel, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      conversationData.customer_id,
      conversationData.conversation_key,
      conversationData.channel || 'web',
      conversationData.status || 'active'
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getConversationByKey(conversationKey, customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM conversations WHERE conversation_key = $1 AND customer_id = $2';
    const result = await client.query(query, [conversationKey, customerId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getConversationsByCustomer(customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM conversations WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [customerId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getAllConversations() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM conversations ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

// ==============
// MESSAGE FUNCTIONS
// ==============

export async function createMessage(messageData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO messages (conversation_id, sender, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      messageData.conversation_id,
      messageData.sender,
      messageData.content
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getConversationMessages(conversationId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC';
    const result = await client.query(query, [conversationId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getMessagesByCustomer(customerId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT m.* FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.customer_id = $1
      ORDER BY m.created_at DESC
    `;
    const result = await client.query(query, [customerId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getAllMessages() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM messages ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

// ==============
// HOT LEAD FUNCTIONS
// ==============

export async function createHotLeadAlert(hotLeadData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO hot_leads (conversation_id, customer_id, trigger_message, keywords_matched, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      hotLeadData.conversation_id,
      hotLeadData.customer_id,
      hotLeadData.trigger_message,
      hotLeadData.keywords_matched,
      hotLeadData.status || 'new'
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getHotLeadsByCustomer(customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM hot_leads WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [customerId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getAllHotLeads() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM hot_leads ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function updateHotLeadStatus(hotLeadId, status) {
  const client = await pool.connect();
  try {
    const query = 'UPDATE hot_leads SET status = $1 WHERE id = $2 RETURNING *';
    const result = await client.query(query, [status, hotLeadId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// ==============
// SMS FUNCTIONS
// ==============

export async function createSmsConversation(conversationData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO sms_conversations (customer_id, customer_phone, business_phone, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      conversationData.customer_id,
      conversationData.customer_phone,
      conversationData.business_phone,
      conversationData.status || 'active'
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getSmsConversationByPhone(phoneNumber, customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM sms_conversations WHERE customer_phone = $1 AND customer_id = $2';
    const result = await client.query(query, [phoneNumber, customerId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getSmsConversationsByCustomer(customerId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM sms_conversations WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [customerId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getAllSmsConversations() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM sms_conversations ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function createSmsMessage(messageData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO sms_messages (conversation_id, sender, content, twilio_sid)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      messageData.conversation_id,
      messageData.sender,
      messageData.content,
      messageData.twilio_sid || null
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getSmsMessages(conversationId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM sms_messages WHERE conversation_id = $1 ORDER BY created_at ASC';
    const result = await client.query(query, [conversationId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getSmsMessagesByCustomer(customerId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT sm.* FROM sms_messages sm
      JOIN sms_conversations sc ON sm.conversation_id = sc.id
      WHERE sc.customer_id = $1
      ORDER BY sm.created_at DESC
    `;
    const result = await client.query(query, [customerId]);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getAllSmsMessages() {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM sms_messages ORDER BY created_at DESC';
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

// ==============
// ANALYTICS FUNCTIONS (Customer-Specific)
// ==============

export async function getCustomerStats(customerId) {
  const client = await pool.connect();
  try {
    // Get conversation count
    const conversationsResult = await client.query(
      'SELECT COUNT(*) as count FROM conversations WHERE customer_id = $1',
      [customerId]
    );
    
    // Get message count
    const messagesResult = await client.query(`
      SELECT COUNT(*) as count FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.customer_id = $1
    `, [customerId]);
    
    // Get hot leads count
    const hotLeadsResult = await client.query(
      'SELECT COUNT(*) as count FROM hot_leads WHERE customer_id = $1',
      [customerId]
    );
    
    // Get SMS conversation count
    const smsConversationsResult = await client.query(
      'SELECT COUNT(*) as count FROM sms_conversations WHERE customer_id = $1',
      [customerId]
    );
    
    // Get SMS message count
    const smsMessagesResult = await client.query(`
      SELECT COUNT(*) as count FROM sms_messages sm
      JOIN sms_conversations sc ON sm.conversation_id = sc.id
      WHERE sc.customer_id = $1
    `, [customerId]);

    return {
      total_conversations: parseInt(conversationsResult.rows[0].count),
      total_messages: parseInt(messagesResult.rows[0].count),
      total_hot_leads: parseInt(hotLeadsResult.rows[0].count),
      total_sms_conversations: parseInt(smsConversationsResult.rows[0].count),
      total_sms_messages: parseInt(smsMessagesResult.rows[0].count)
    };
  } finally {
    client.release();
  }
}

// ==============
// LEGACY FUNCTIONS (for backward compatibility)
// ==============

export async function getCustomers() {
  return getAllCustomers();
}

export async function getConversations() {
  return getAllConversations();
}

export async function getMessages() {
  return getAllMessages();
}

export async function getHotLeads() {
  return getAllHotLeads();
}

export async function getSmsConversations() {
  return getAllSmsConversations();
}

// ==============
// DEBUG FUNCTION
// ==============

export async function debugDatabase() {
  const client = await pool.connect();
  try {
    const customers = await client.query('SELECT COUNT(*) as count FROM customers');
    const conversations = await client.query('SELECT COUNT(*) as count FROM conversations');
    const messages = await client.query('SELECT COUNT(*) as count FROM messages');
    const hotLeads = await client.query('SELECT COUNT(*) as count FROM hot_leads');
    const smsConversations = await client.query('SELECT COUNT(*) as count FROM sms_conversations');
    const smsMessages = await client.query('SELECT COUNT(*) as count FROM sms_messages');
    
    console.log('=== POSTGRES DATABASE STATE ===');
    console.log('Customers:', customers.rows[0].count);
    console.log('Conversations:', conversations.rows[0].count);
    console.log('Messages:', messages.rows[0].count);
    console.log('Hot Leads:', hotLeads.rows[0].count);
    console.log('SMS Conversations:', smsConversations.rows[0].count);
    console.log('SMS Messages:', smsMessages.rows[0].count);
    console.log('================================');
    
    return {
      customers: customers.rows[0].count,
      conversations: conversations.rows[0].count,
      messages: messages.rows[0].count,
      hotLeads: hotLeads.rows[0].count,
      smsConversations: smsConversations.rows[0].count,
      smsMessages: smsMessages.rows[0].count
    };
  } finally {
    client.release();
  }
}
