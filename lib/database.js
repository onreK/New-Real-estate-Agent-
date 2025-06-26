// In-memory database simulation
let db = {
  customers: [
    {
      id: 1,
      name: "Demo Customer",
      email: "demo@testrealestate.com",
      phone: "+1234567890",
      clerk_user_id: null, // No Clerk ID for demo customer
      created_at: "2024-01-01T00:00:00.000Z",
      subscription_tier: "pro",
      subscription_status: "active"
    }
  ],
  conversations: [],
  messages: [],
  hot_leads: [],
  sms_conversations: [],
  sms_messages: []
};

// Get database client (simulated)
export function getDbClient() {
  return db;
}

// ==============
// CUSTOMER FUNCTIONS
// ==============

export async function createCustomer(customerData) {
  const customer = {
    ...customerData,
    id: customerData.id || Date.now()
  };
  
  db.customers.push(customer);
  console.log('✅ Customer created:', customer);
  return customer;
}

export async function getCustomerByClerkId(clerkUserId) {
  return db.customers.find(customer => customer.clerk_user_id === clerkUserId);
}

export async function getCustomerById(customerId) {
  return db.customers.find(customer => customer.id === customerId);
}

export async function getAllCustomers() {
  return db.customers;
}

// ==============
// CONVERSATION FUNCTIONS
// ==============

export async function createConversation(conversationData) {
  const conversation = {
    id: Date.now(),
    ...conversationData
  };
  
  db.conversations.push(conversation);
  return conversation;
}

export async function getConversationByKey(conversationKey, customerId) {
  return db.conversations.find(conv => 
    conv.conversation_key === conversationKey && conv.customer_id === customerId
  );
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
    id: Date.now(),
    ...messageData
  };
  
  db.messages.push(message);
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
    id: Date.now(),
    ...hotLeadData
  };
  
  db.hot_leads.push(hotLead);
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
    id: Date.now(),
    ...conversationData
  };
  
  db.sms_conversations.push(conversation);
  return conversation;
}

export async function getSmsConversationByPhone(phoneNumber, customerId) {
  return db.sms_conversations.find(conv => 
    conv.customer_phone === phoneNumber && conv.customer_id === customerId
  );
}

export async function getSmsConversationsByCustomer(customerId) {
  return db.sms_conversations.filter(conv => conv.customer_id === customerId);
}

export async function getAllSmsConversations() {
  return db.sms_conversations;
}

export async function createSmsMessage(messageData) {
  const message = {
    id: Date.now(),
    ...messageData
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

  return {
    total_conversations: conversations.length,
    total_messages: messages.length,
    total_hot_leads: hotLeads.length,
    total_sms_conversations: smsConversations.length,
    total_sms_messages: smsMessages.length,
    recent_activity: messages
      .concat(smsMessages)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
  };
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
