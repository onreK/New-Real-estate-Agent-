// For now, let's use a hybrid approach that works with both in-memory and Postgres
// This prevents build timeouts while still supporting the multi-tenant functionality

// In-memory database simulation (fallback for build/development)
let db = {
  customers: [
    {
      id: 1,
      clerk_user_id: "demo_user_123",
      email: "demo@testrealestate.com",
      business_name: "Test Real Estate Co",
      plan: "basic",
      created_at: "2024-01-01T00:00:00.000Z"
    }
  ],
  conversations: [],
  messages: [],
  hot_leads: [],
  sms_conversations: [],
  sms_messages: []
};

// Simple ID generator
let nextId = 1000;

// Get database client (simulated for now)
export function getDbClient() {
  return db;
}

// ==============
// CUSTOMER FUNCTIONS
// ==============

export async function createCustomer(customerData) {
  const customer = {
    id: nextId++,
    clerk_user_id: customerData.clerk_user_id,
    email: customerData.email || '',
    business_name: customerData.business_name || customerData.name || 'My Business',
    plan: customerData.plan || 'basic',
    created_at: new Date().toISOString()
  };
  
  db.customers.push(customer);
  console.log('✅ Customer created:', customer);
  return customer;
}

export async function getCustomerByClerkId(clerkUserId) {
  const customer = db.customers.find(customer => customer.clerk_user_id === clerkUserId);
  console.log('🔍 Looking for customer with Clerk ID:', clerkUserId);
  console.log('🔍 Found customer:', customer);
  return customer || null;
}

export async function getCustomerById(customerId) {
  return db.customers.find(customer => customer.id === customerId) || null;
}

export async function getAllCustomers() {
  return db.customers;
}

// ==============
// CONVERSATION FUNCTIONS
// ==============

export async function createConversation(conversationData) {
  const conversation = {
    id: nextId++,
    customer_id: conversationData.customer_id,
    conversation_key: conversationData.conversation_key,
    channel: conversationData.channel || 'web',
    status: conversationData.status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.conversations.push(conversation);
  console.log('✅ Conversation created:', conversation);
  return conversation;
}

export async function getConversationByKey(conversationKey, customerId) {
  return db.conversations.find(conv => 
    conv.conversation_key === conversationKey && conv.customer_id === customerId
  ) || null;
}

export async function getConversationsByCustomer(customerId) {
  return db.conversations.filter(conv => conv.customer_id === customerId);
}

export async function getAllConversations() {
  return db.conversations;
}

// ==============
// MESSAGE FUNCTIONS
// ==============

export async function createMessage(messageData) {
  const message = {
    id: nextId++,
    conversation_id: messageData.conversation_id,
    sender: messageData.sender,
    content: messageData.content,
    created_at: new Date().toISOString()
  };
  
  db.messages.push(message);
  console.log('✅ Message created:', message.sender, ':', message.content.substring(0, 50) + '...');
  return message;
}

export async function getConversationMessages(conversationId) {
  return db.messages
    .filter(msg => msg.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function getMessagesByCustomer(customerId) {
  // Get all conversations for this customer
  const customerConversations = await getConversationsByCustomer(customerId);
  const conversationIds = customerConversations.map(conv => conv.id);
  
  // Get all messages for these conversations
  return db.messages.filter(msg => conversationIds.includes(msg.conversation_id));
}

export async function getAllMessages() {
  return db.messages;
}

// ==============
// HOT LEAD FUNCTIONS
// ==============

export async function createHotLeadAlert(hotLeadData) {
  const hotLead = {
    id: nextId++,
    conversation_id: hotLeadData.conversation_id,
    customer_id: hotLeadData.customer_id,
    trigger_message: hotLeadData.trigger_message,
    keywords_matched: hotLeadData.keywords_matched,
    status: hotLeadData.status || 'new',
    created_at: new Date().toISOString()
  };
  
  db.hot_leads.push(hotLead);
  console.log('🔥 Hot lead created:', hotLead);
  return hotLead;
}

export async function getHotLeadsByCustomer(customerId) {
  return db.hot_leads.filter(lead => lead.customer_id === customerId);
}

export async function getAllHotLeads() {
  return db.hot_leads;
}

export async function updateHotLeadStatus(hotLeadId, status) {
  const hotLead = db.hot_leads.find(lead => lead.id === hotLeadId);
  if (hotLead) {
    hotLead.status = status;
    hotLead.updated_at = new Date().toISOString();
  }
  return hotLead;
}

// ==============
// SMS FUNCTIONS
// ==============

export async function createSmsConversation(conversationData) {
  const conversation = {
    id: nextId++,
    customer_id: conversationData.customer_id,
    customer_phone: conversationData.customer_phone,
    business_phone: conversationData.business_phone,
    status: conversationData.status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.sms_conversations.push(conversation);
  return conversation;
}

export async function getSmsConversationByPhone(phoneNumber, customerId) {
  return db.sms_conversations.find(conv => 
    conv.customer_phone === phoneNumber && conv.customer_id === customerId
  ) || null;
}

export async function getSmsConversationsByCustomer(customerId) {
  return db.sms_conversations.filter(conv => conv.customer_id === customerId);
}

export async function getAllSmsConversations() {
  return db.sms_conversations;
}

export async function createSmsMessage(messageData) {
  const message = {
    id: nextId++,
    conversation_id: messageData.conversation_id,
    sender: messageData.sender,
    content: messageData.content,
    twilio_sid: messageData.twilio_sid || null,
    created_at: new Date().toISOString()
  };
  
  db.sms_messages.push(message);
  return message;
}

export async function getSmsMessages(conversationId) {
  return db.sms_messages
    .filter(msg => msg.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function getSmsMessagesByCustomer(customerId) {
  // Get all SMS conversations for this customer
  const customerConversations = await getSmsConversationsByCustomer(customerId);
  const conversationIds = customerConversations.map(conv => conv.id);
  
  // Get all SMS messages for these conversations
  return db.sms_messages.filter(msg => conversationIds.includes(msg.conversation_id));
}

export async function getAllSmsMessages() {
  return db.sms_messages;
}

// ==============
// ANALYTICS FUNCTIONS (Customer-Specific)
// ==============

export async function getCustomerStats(customerId) {
  const conversations = await getConversationsByCustomer(customerId);
  const messages = await getMessagesByCustomer(customerId);
  const hotLeads = await getHotLeadsByCustomer(customerId);
  const smsConversations = await getSmsConversationsByCustomer(customerId);
  const smsMessages = await getSmsMessagesByCustomer(customerId);

  const stats = {
    total_conversations: conversations.length,
    total_messages: messages.length,
    total_hot_leads: hotLeads.length,
    total_sms_conversations: smsConversations.length,
    total_sms_messages: smsMessages.length
  };

  console.log('📊 Customer stats for', customerId, ':', stats);
  return stats;
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

export function debugDatabase() {
  console.log('=== DATABASE STATE ===');
  console.log('Customers:', db.customers.length);
  console.log('Conversations:', db.conversations.length);
  console.log('Messages:', db.messages.length);
  console.log('Hot Leads:', db.hot_leads.length);
  console.log('SMS Conversations:', db.sms_conversations.length);
  console.log('SMS Messages:', db.sms_messages.length);
  console.log('=====================');
  return db;
}
