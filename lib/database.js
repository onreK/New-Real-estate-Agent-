// ADD THIS TO YOUR EXISTING lib/database.js file
// Insert these table creations in your initializeDatabase() function

// ADD THESE TABLES TO YOUR EXISTING initializeDatabase() function:

// ==============
// ADD THESE AFTER YOUR EXISTING TABLES IN initializeDatabase()
// ==============

// In your initializeDatabase() function, ADD these table creations:

    // Create leads table (for email automation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        business_type VARCHAR(100),
        message TEXT,
        score INTEGER DEFAULT 0,
        lead_source VARCHAR(50) DEFAULT 'chatbot',
        conversation_id INTEGER REFERENCES conversations(id),
        email_score INTEGER DEFAULT 0,
        last_email_sent TIMESTAMP,
        email_sequence_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        template_type VARCHAR(50) NOT NULL,
        industry VARCHAR(100),
        variables JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        campaign_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        total_recipients INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        opens INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        unsubscribes INTEGER DEFAULT 0,
        bounces INTEGER DEFAULT 0,
        ai_config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_sends table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_sends (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES email_templates(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        resend_email_id VARCHAR(255),
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        send_at TIMESTAMP,
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        bounced_at TIMESTAMP,
        error_message TEXT,
        tracking_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id SERIAL PRIMARY KEY,
        email_send_id INTEGER NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ai_email_generations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_email_generations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        generated_subject VARCHAR(255),
        generated_content TEXT,
        ai_model VARCHAR(50),
        ai_config JSONB,
        generation_time_ms INTEGER,
        tokens_used INTEGER,
        was_sent BOOLEAN DEFAULT false,
        performance_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add email config to existing customers table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS email_config JSONB,
      ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS last_email_activity TIMESTAMP
    `);

    // Insert default email template
    await client.query(`
      INSERT INTO email_templates (user_id, name, subject, html_content, template_type, industry) 
      VALUES ('default', 'Welcome Email', 'Welcome! Let''s help you find your perfect property', 
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome!</h2>
      <p>Thank you for your interest in our services. We''re excited to help you with your needs.</p>
      <p>Our experienced team is here to assist you.</p>
      <p>We''ll be in touch soon with more information tailored to your needs.</p>
      <p>Best regards,<br>Your Team</p>
      </div>', 'welcome', 'general')
      ON CONFLICT DO NOTHING
    `);

// ==============
// ADD THESE EMAIL FUNCTIONS TO THE END OF YOUR database.js FILE
// ==============

// LEADS FUNCTIONS (for email automation)
export async function createLead(leadData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO leads (user_id, name, email, phone, business_type, message, score, lead_source, conversation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      leadData.user_id || leadData.userId,
      leadData.name,
      leadData.email,
      leadData.phone,
      leadData.business_type || leadData.businessType,
      leadData.message,
      leadData.score || 0,
      leadData.lead_source || leadData.leadSource || 'chatbot',
      leadData.conversation_id || leadData.conversationId
    ];
    
    const result = await client.query(query, values);
    console.log('✅ Lead created:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating lead:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getLeadById(leadId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM leads WHERE id = $1';
    const result = await client.query(query, [leadId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting lead by ID:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function getLeadsByUserId(userId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting leads by user ID:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getLeadByEmail(userId, email) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM leads WHERE user_id = $1 AND email = $2 ORDER BY created_at DESC LIMIT 1';
    const result = await client.query(query, [userId, email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting lead by email:', error);
    return null;
  } finally {
    client.release();
  }
}

// EMAIL SENDS FUNCTIONS
export async function createEmailSend(emailData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO email_sends (
        campaign_id, template_id, lead_id, customer_id, conversation_id,
        resend_email_id, to_email, subject, html_content, text_content, 
        status, sent_at, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      emailData.campaign_id,
      emailData.template_id,
      emailData.lead_id,
      emailData.customer_id,
      emailData.conversation_id,
      emailData.resend_email_id,
      emailData.to_email,
      emailData.subject,
      emailData.html_content,
      emailData.text_content,
      emailData.status || 'pending',
      emailData.sent_at,
      emailData.error_message
    ];
    
    const result = await client.query(query, values);
    console.log('✅ Email send logged:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating email send:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getEmailSendsByUserId(userId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT es.*, l.name as lead_name, l.email as lead_email
      FROM email_sends es
      LEFT JOIN leads l ON es.lead_id = l.id
      WHERE l.user_id = $1 OR es.customer_id IN (
        SELECT id FROM customers WHERE clerk_user_id = $1
      )
      ORDER BY es.created_at DESC
    `;
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting email sends by user ID:', error);
    return [];
  } finally {
    client.release();
  }
}

// AI EMAIL GENERATION FUNCTIONS
export async function createAIEmailGeneration(generationData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO ai_email_generations (
        user_id, lead_id, conversation_id, prompt, generated_subject, 
        generated_content, ai_model, ai_config, tokens_used, was_sent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      generationData.user_id,
      generationData.lead_id,
      generationData.conversation_id,
      generationData.prompt,
      generationData.generated_subject,
      generationData.generated_content,
      generationData.ai_model,
      JSON.stringify(generationData.ai_config || {}),
      generationData.tokens_used,
      generationData.was_sent || false
    ];
    
    const result = await client.query(query, values);
    console.log('✅ AI email generation logged:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating AI email generation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// EMAIL STATS FUNCTIONS
export async function getEmailStatsByUserId(userId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'opened' THEN 1 END) as total_opened,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as total_clicked
      FROM email_sends es
      LEFT JOIN leads l ON es.lead_id = l.id
      WHERE l.user_id = $1 OR es.customer_id IN (
        SELECT id FROM customers WHERE clerk_user_id = $1
      )
      AND es.status != 'failed'
    `;
    
    const result = await client.query(query, [userId]);
    const stats = result.rows[0];
    
    const totalSent = parseInt(stats.total_sent) || 0;
    const totalOpened = parseInt(stats.total_opened) || 0;
    const totalClicked = parseInt(stats.total_clicked) || 0;

    return {
      totalSent,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      responseRate: 0 // Can be implemented later
    };
  } catch (error) {
    console.error('❌ Error getting email stats:', error);
    return { totalSent: 0, openRate: 0, clickRate: 0, responseRate: 0 };
  } finally {
    client.release();
  }
}
