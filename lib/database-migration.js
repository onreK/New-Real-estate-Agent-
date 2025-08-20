// lib/database-migration.js
// COMPLETE DATABASE MIGRATION FILE FOR MULTI-TENANT ARCHITECTURE - FIXED VERSION
// This file creates all missing tables and migrates your data to proper multi-tenant structure

import { query } from './database.js';

/**
 * 🚀 MAIN MIGRATION FUNCTION - RUN THIS TO UPGRADE YOUR DATABASE
 */
export async function runFullMigration() {
  console.log('🚀 Starting BizzyBotAI Multi-Tenant Database Migration...');
  
  try {
    // Step 1: Create the ai_analytics_events table if it doesn't exist
    await createAiAnalyticsEventsTable();
    
    // Step 2: Create the new contacts table with proper multi-tenant design
    await createContactsTable();
    
    // Step 3: Create the contact_events table for tracking all interactions
    await createContactEventsTable();
    
    // Step 4: Add all performance indexes
    await createPerformanceIndexes();
    
    // Step 5: Migrate existing data from metadata to contacts table
    await migrateExistingLeadsToContacts();
    
    // Step 6: Add customer_id foreign key constraint if not exists
    await addCustomerIdConstraints();
    
    // Step 7: Create views for easier querying
    await createAnalyticsViews();
    
    console.log('✅ Migration completed successfully!');
    
    // Return migration summary
    const summary = await getMigrationSummary();
    return {
      success: true,
      summary
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 1: Create ai_analytics_events table (your main events table)
 */
async function createAiAnalyticsEventsTable() {
  console.log('📊 Creating ai_analytics_events table...');
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_analytics_events (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        contact_id INTEGER, -- Will be populated after migration
        event_type VARCHAR(100) NOT NULL,
        channel VARCHAR(50),
        user_message TEXT,
        ai_response TEXT,
        metadata JSONB, -- Keep for backward compatibility during transition
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ ai_analytics_events table created/verified');
    
    // Check if event_data column exists and rename it to metadata
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ai_analytics_events' 
      AND column_name = 'event_data'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('🔄 Renaming event_data column to metadata...');
      await query(`ALTER TABLE ai_analytics_events RENAME COLUMN event_data TO metadata`);
      console.log('✅ Column renamed successfully');
    }
    
    // Add customer_id column if it doesn't exist
    await query(`
      ALTER TABLE ai_analytics_events 
      ADD COLUMN IF NOT EXISTS customer_id INTEGER
    `);
    
    // Set default customer_id for existing records (your current customer)
    await query(`
      UPDATE ai_analytics_events 
      SET customer_id = 863 
      WHERE customer_id IS NULL
    `);
    
    // Make customer_id NOT NULL after setting defaults
    await query(`
      ALTER TABLE ai_analytics_events 
      ALTER COLUMN customer_id SET NOT NULL
    `);
    
  } catch (error) {
    if (error.code === '42P07') { // Table already exists
      console.log('ℹ️ ai_analytics_events table already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Step 2: Create the new contacts table with multi-tenant design
 */
async function createContactsTable() {
  console.log('👥 Creating contacts table with multi-tenant design...');
  
  await query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      
      -- Contact identifiers
      email VARCHAR(255),
      phone VARCHAR(50),
      name VARCHAR(255),
      company VARCHAR(255),
      
      -- Additional contact info
      title VARCHAR(255),
      industry VARCHAR(100),
      location VARCHAR(255),
      website VARCHAR(255),
      social_profiles JSONB,
      
      -- Lead scoring and classification
      lead_score INTEGER DEFAULT 0,
      lead_temperature VARCHAR(20) DEFAULT 'cold', -- hot, warm, cold
      lead_status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, converted, lost
      potential_value DECIMAL(10,2),
      
      -- Engagement metrics (denormalized for performance)
      first_interaction_at TIMESTAMP,
      last_interaction_at TIMESTAMP,
      total_interactions INTEGER DEFAULT 0,
      hot_lead_count INTEGER DEFAULT 0,
      appointment_count INTEGER DEFAULT 0,
      phone_request_count INTEGER DEFAULT 0,
      
      -- Source tracking
      source_channel VARCHAR(50), -- email, sms, chat, social, web
      source_campaign VARCHAR(255),
      referrer VARCHAR(500),
      
      -- Multi-channel presence
      channels_used TEXT[], -- Array of channels this contact has used
      preferred_channel VARCHAR(50),
      
      -- Internal notes and tags
      notes TEXT,
      tags TEXT[],
      assigned_to VARCHAR(255), -- For future team features
      
      -- Metadata
      custom_fields JSONB, -- For customer-specific fields
      is_active BOOLEAN DEFAULT true,
      is_duplicate BOOLEAN DEFAULT false,
      merged_with_id INTEGER REFERENCES contacts(id),
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      -- CRITICAL: Composite unique constraints for multi-tenancy
      -- A customer can't have two contacts with the same email
      CONSTRAINT unique_customer_email UNIQUE(customer_id, email),
      -- A customer can't have two contacts with the same phone
      CONSTRAINT unique_customer_phone UNIQUE(customer_id, phone),
      
      -- Ensure at least email or phone exists
      CONSTRAINT check_email_or_phone CHECK (
        email IS NOT NULL OR phone IS NOT NULL
      )
    )
  `);
  
  console.log('✅ Contacts table created successfully');
  
  // Create a trigger to update the updated_at timestamp
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  await query(`
    DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
    CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * Step 3: Create contact_events table for detailed interaction tracking
 */
async function createContactEventsTable() {
  console.log('📝 Creating contact_events table...');
  
  // Create the table first without inline indexes (PostgreSQL style)
  await query(`
    CREATE TABLE IF NOT EXISTS contact_events (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      
      -- Event details
      event_type VARCHAR(100) NOT NULL,
      event_category VARCHAR(50), -- engagement, conversion, communication
      channel VARCHAR(50),
      
      -- Event data
      description TEXT,
      metadata JSONB,
      
      -- Scoring impact
      score_impact INTEGER DEFAULT 0,
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes separately (PostgreSQL style)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_contact_events_customer ON contact_events(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_contact_events_contact ON contact_events(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_contact_events_type ON contact_events(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_contact_events_created ON contact_events(created_at DESC)'
  ];
  
  for (const indexSql of indexes) {
    try {
      await query(indexSql);
    } catch (error) {
      console.log('⚠️ Index error (may already exist):', error.message);
    }
  }
  
  console.log('✅ Contact events table created');
}

/**
 * Step 4: Create all performance indexes
 */
async function createPerformanceIndexes() {
  console.log('🚀 Creating performance indexes...');
  
  const indexes = [
    // Contacts table indexes
    'CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON contacts(lead_temperature)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(lead_status)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC)',
    
    // Composite indexes for common queries
    'CREATE INDEX IF NOT EXISTS idx_contacts_customer_score ON contacts(customer_id, lead_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_customer_temperature ON contacts(customer_id, lead_temperature)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_customer_active ON contacts(customer_id, is_active)',
    
    // ai_analytics_events indexes
    'CREATE INDEX IF NOT EXISTS idx_events_customer_id ON ai_analytics_events(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_contact_id ON ai_analytics_events(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_type ON ai_analytics_events(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_events_channel ON ai_analytics_events(channel)',
    'CREATE INDEX IF NOT EXISTS idx_events_created ON ai_analytics_events(created_at DESC)',
    
    // Composite indexes for analytics
    'CREATE INDEX IF NOT EXISTS idx_events_customer_type ON ai_analytics_events(customer_id, event_type)',
    'CREATE INDEX IF NOT EXISTS idx_events_customer_created ON ai_analytics_events(customer_id, created_at DESC)',
    
    // JSONB indexes for metadata queries
    'CREATE INDEX IF NOT EXISTS idx_events_metadata_email ON ai_analytics_events((metadata->>\'contact_email\')) WHERE metadata IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_events_metadata_phone ON ai_analytics_events((metadata->>\'contact_phone\')) WHERE metadata IS NOT NULL'
  ];
  
  for (const indexSql of indexes) {
    try {
      await query(indexSql);
      console.log('✅ Index created/verified');
    } catch (error) {
      console.log('⚠️ Index error (may already exist):', error.message);
    }
  }
  
  console.log('✅ All performance indexes created');
}

/**
 * Step 5: Migrate existing lead data from metadata to contacts table
 */
async function migrateExistingLeadsToContacts() {
  console.log('📦 Migrating existing leads to contacts table...');
  
  try {
    // Get all unique leads from the metadata
    const uniqueLeads = await query(`
      SELECT DISTINCT
        customer_id,
        metadata->>'contact_email' as email,
        metadata->>'contact_phone' as phone,
        metadata->>'contact_name' as name,
        metadata->>'company' as company,
        MIN(created_at) as first_interaction,
        MAX(created_at) as last_interaction,
        COUNT(*) as interaction_count,
        COUNT(CASE WHEN event_type = 'hot_lead' THEN 1 END) as hot_lead_count,
        COUNT(CASE WHEN event_type = 'appointment_scheduled' THEN 1 END) as appointment_count,
        COUNT(CASE WHEN event_type = 'phone_request' THEN 1 END) as phone_request_count,
        ARRAY_AGG(DISTINCT channel) as channels_used
      FROM ai_analytics_events
      WHERE metadata IS NOT NULL
        AND (
          metadata->>'contact_email' IS NOT NULL 
          OR metadata->>'contact_phone' IS NOT NULL
        )
      GROUP BY 
        customer_id,
        metadata->>'contact_email',
        metadata->>'contact_phone',
        metadata->>'contact_name',
        metadata->>'company'
    `);
    
    console.log(`📊 Found ${uniqueLeads.rows.length} unique leads to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const lead of uniqueLeads.rows) {
      try {
        // Check if contact already exists
        const existingCheck = await query(`
          SELECT id FROM contacts 
          WHERE customer_id = $1 
            AND (
              (email = $2 AND email IS NOT NULL)
              OR (phone = $3 AND phone IS NOT NULL)
            )
        `, [lead.customer_id, lead.email, lead.phone]);
        
        if (existingCheck.rows.length > 0) {
          // Update existing contact
          const contactId = existingCheck.rows[0].id;
          
          await query(`
            UPDATE contacts 
            SET 
              name = COALESCE(name, $1),
              company = COALESCE(company, $2),
              last_interaction_at = GREATEST(last_interaction_at, $3),
              total_interactions = total_interactions + $4,
              hot_lead_count = hot_lead_count + $5,
              appointment_count = appointment_count + $6,
              phone_request_count = phone_request_count + $7,
              channels_used = ARRAY(SELECT DISTINCT unnest(channels_used || $8::text[])),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
          `, [
            lead.name,
            lead.company,
            lead.last_interaction,
            lead.interaction_count,
            lead.hot_lead_count,
            lead.appointment_count,
            lead.phone_request_count,
            lead.channels_used,
            contactId
          ]);
          
          // Update events to reference this contact
          await updateEventsWithContactId(lead, contactId);
          
          skipped++;
        } else {
          // Calculate lead score
          const leadScore = calculateLeadScore({
            hot_lead_count: lead.hot_lead_count,
            appointment_count: lead.appointment_count,
            phone_request_count: lead.phone_request_count,
            interaction_count: lead.interaction_count,
            last_interaction: lead.last_interaction
          });
          
          // Determine lead temperature
          const temperature = classifyLeadTemperature(leadScore, lead);
          
          // Insert new contact
          const insertResult = await query(`
            INSERT INTO contacts (
              customer_id, email, phone, name, company,
              first_interaction_at, last_interaction_at,
              total_interactions, hot_lead_count, appointment_count, phone_request_count,
              channels_used, lead_score, lead_temperature,
              source_channel, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING id
          `, [
            lead.customer_id,
            lead.email || null,
            lead.phone || null,
            lead.name || 'Unknown',
            lead.company || null,
            lead.first_interaction,
            lead.last_interaction,
            lead.interaction_count,
            lead.hot_lead_count,
            lead.appointment_count,
            lead.phone_request_count,
            lead.channels_used,
            leadScore,
            temperature,
            lead.channels_used?.[0] || 'unknown'
          ]);
          
          const contactId = insertResult.rows[0].id;
          
          // Update events to reference this contact
          await updateEventsWithContactId(lead, contactId);
          
          migrated++;
        }
      } catch (error) {
        console.error(`⚠️ Error migrating lead: ${lead.email || lead.phone}`, error.message);
      }
    }
    
    console.log(`✅ Migration complete: ${migrated} new contacts created, ${skipped} updated`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

/**
 * Helper function to update events with contact_id
 */
async function updateEventsWithContactId(lead, contactId) {
  // Build the WHERE clause based on available identifiers
  let whereConditions = ['customer_id = $1', 'contact_id IS NULL'];
  const params = [lead.customer_id];
  
  if (lead.email) {
    whereConditions.push(`metadata->>'contact_email' = $${params.length + 1}`);
    params.push(lead.email);
  }
  
  if (lead.phone) {
    whereConditions.push(`metadata->>'contact_phone' = $${params.length + 1}`);
    params.push(lead.phone);
  }
  
  params.push(contactId);
  
  const updateSql = `
    UPDATE ai_analytics_events 
    SET contact_id = $${params.length}
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  await query(updateSql, params);
}

/**
 * Helper function to calculate lead score
 */
function calculateLeadScore(lead) {
  let score = 0;
  
  // Engagement signals (40 points max)
  if (lead.hot_lead_count > 0) score += 20;
  if (lead.appointment_count > 0) score += 15;
  if (lead.phone_request_count > 0) score += 10;
  
  // Recency (20 points max)
  const daysSinceContact = Math.floor(
    (new Date() - new Date(lead.last_interaction)) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceContact === 0) score += 20;
  else if (daysSinceContact <= 1) score += 15;
  else if (daysSinceContact <= 3) score += 10;
  else if (daysSinceContact <= 7) score += 5;
  
  // Frequency (20 points max)
  if (lead.interaction_count >= 10) score += 20;
  else if (lead.interaction_count >= 5) score += 15;
  else if (lead.interaction_count >= 3) score += 10;
  else if (lead.interaction_count >= 1) score += 5;
  
  return Math.min(100, score);
}

/**
 * Helper function to classify lead temperature
 */
function classifyLeadTemperature(score, lead) {
  if (score >= 70 || lead.hot_lead_count > 0 || lead.appointment_count > 0) {
    return 'hot';
  }
  if (score >= 40 || lead.phone_request_count > 0) {
    return 'warm';
  }
  return 'cold';
}

/**
 * Step 6: Add customer_id foreign key constraints
 */
async function addCustomerIdConstraints() {
  console.log('🔒 Adding foreign key constraints...');
  
  try {
    // Add foreign key to ai_analytics_events if not exists
    await query(`
      ALTER TABLE ai_analytics_events 
      ADD CONSTRAINT fk_events_customer 
      FOREIGN KEY (customer_id) 
      REFERENCES customers(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Foreign key constraints added');
  } catch (error) {
    if (error.code === '42710') { // Constraint already exists
      console.log('ℹ️ Foreign key constraints already exist');
    } else {
      console.log('⚠️ Could not add foreign key:', error.message);
    }
  }
}

/**
 * Step 7: Create helpful views for analytics
 */
async function createAnalyticsViews() {
  console.log('📊 Creating analytics views...');
  
  // Create a view for lead overview per customer
  await query(`
    CREATE OR REPLACE VIEW customer_lead_overview AS
    SELECT 
      c.customer_id,
      COUNT(DISTINCT c.id) as total_contacts,
      COUNT(DISTINCT CASE WHEN c.lead_temperature = 'hot' THEN c.id END) as hot_leads,
      COUNT(DISTINCT CASE WHEN c.lead_temperature = 'warm' THEN c.id END) as warm_leads,
      COUNT(DISTINCT CASE WHEN c.lead_temperature = 'cold' THEN c.id END) as cold_leads,
      AVG(c.lead_score) as avg_lead_score,
      SUM(c.potential_value) as total_potential_value,
      MAX(c.last_interaction_at) as last_activity
    FROM contacts c
    WHERE c.is_active = true
    GROUP BY c.customer_id
  `);
  
  // Create a view for recent hot leads
  await query(`
    CREATE OR REPLACE VIEW recent_hot_leads AS
    SELECT 
      c.*,
      cust.business_name,
      cust.email as customer_email
    FROM contacts c
    JOIN customers cust ON c.customer_id = cust.id
    WHERE c.lead_temperature = 'hot'
      AND c.last_interaction_at >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY c.lead_score DESC, c.last_interaction_at DESC
  `);
  
  console.log('✅ Analytics views created');
}

/**
 * Get migration summary
 */
async function getMigrationSummary() {
  const summary = {};
  
  // Count records in each table
  const tables = [
    'customers',
    'contacts',
    'ai_analytics_events',
    'contact_events'
  ];
  
  for (const table of tables) {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
      summary[table] = parseInt(result.rows[0].count);
    } catch (error) {
      summary[table] = 0;
    }
  }
  
  // Get contacts with and without contact_id
  const eventsWithContact = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE contact_id IS NOT NULL) as with_contact,
      COUNT(*) FILTER (WHERE contact_id IS NULL) as without_contact
    FROM ai_analytics_events
  `);
  
  summary.events_linked = parseInt(eventsWithContact.rows[0].with_contact);
  summary.events_unlinked = parseInt(eventsWithContact.rows[0].without_contact);
  
  return summary;
}

/**
 * UTILITY FUNCTIONS FOR MANUAL OPERATIONS
 */

// Function to manually link an event to a contact
export async function linkEventToContact(eventId, contactId) {
  await query(
    'UPDATE ai_analytics_events SET contact_id = $1 WHERE id = $2',
    [contactId, eventId]
  );
}

// Function to merge duplicate contacts
export async function mergeContacts(customerId, primaryContactId, duplicateContactId) {
  // Update all events to point to primary contact
  await query(
    'UPDATE ai_analytics_events SET contact_id = $1 WHERE contact_id = $2 AND customer_id = $3',
    [primaryContactId, duplicateContactId, customerId]
  );
  
  // Update all contact_events to point to primary contact
  await query(
    'UPDATE contact_events SET contact_id = $1 WHERE contact_id = $2 AND customer_id = $3',
    [primaryContactId, duplicateContactId, customerId]
  );
  
  // Mark duplicate as merged
  await query(
    'UPDATE contacts SET is_active = false, merged_with_id = $1 WHERE id = $2 AND customer_id = $3',
    [primaryContactId, duplicateContactId, customerId]
  );
}

// Function to check for duplicate contacts
export async function findDuplicateContacts(customerId) {
  const result = await query(`
    SELECT 
      email,
      phone,
      name,
      COUNT(*) as duplicate_count,
      ARRAY_AGG(id) as contact_ids
    FROM contacts
    WHERE customer_id = $1 
      AND is_active = true
    GROUP BY email, phone, name
    HAVING COUNT(*) > 1
  `, [customerId]);
  
  return result.rows;
}

// Export all functions
export default {
  runFullMigration,
  linkEventToContact,
  mergeContacts,
  findDuplicateContacts,
  getMigrationSummary
};
