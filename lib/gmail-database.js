// lib/gmail-database.js
import { query } from './database.js';

// Gmail Connection Management
export async function saveGmailConnection(connectionData) {
  try {
    const { user_id, email, access_token, refresh_token, token_expiry } = connectionData;
    
    const result = await query(`
      INSERT INTO gmail_connections (user_id, email, access_token, refresh_token, token_expiry)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, email) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        status = 'connected',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [user_id, email, access_token, refresh_token, token_expiry]);
    
    console.log('✅ Gmail connection saved to database');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving Gmail connection:', error);
    throw error;
  }
}

export async function getGmailConnection(user_id, email = null) {
  try {
    let queryText, params;
    
    if (email) {
      queryText = 'SELECT * FROM gmail_connections WHERE user_id = $1 AND email = $2 AND status = $3';
      params = [user_id, email, 'connected'];
    } else {
      queryText = 'SELECT * FROM gmail_connections WHERE user_id = $1 AND status = $2 ORDER BY connected_at DESC LIMIT 1';
      params = [user_id, 'connected'];
    }
    
    const result = await query(queryText, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting Gmail connection:', error);
    throw error;
  }
}

export async function getAllGmailConnections(user_id) {
  try {
    const result = await query(
      'SELECT * FROM gmail_connections WHERE user_id = $1 AND status = $2 ORDER BY connected_at DESC',
      [user_id, 'connected']
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting Gmail connections:', error);
    throw error;
  }
}

export async function updateGmailTokens(connection_id, access_token, token_expiry) {
  try {
    const result = await query(`
      UPDATE gmail_connections 
      SET access_token = $1, token_expiry = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [access_token, token_expiry, connection_id]);
    
    console.log('✅ Gmail tokens updated in database');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating Gmail tokens:', error);
    throw error;
  }
}

export async function disconnectGmail(user_id, email) {
  try {
    const result = await query(`
      UPDATE gmail_connections 
      SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND email = $2
      RETURNING *
    `, [user_id, email]);
    
    console.log('✅ Gmail connection disconnected');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error disconnecting Gmail:', error);
    throw error;
  }
}

// Email Conversation Management
export async function createOrUpdateConversation(conversationData) {
  try {
    const { 
      gmail_connection_id, 
      thread_id, 
      customer_email, 
      customer_name, 
      subject 
    } = conversationData;
    
    const result = await query(`
      INSERT INTO gmail_conversations (
        gmail_connection_id, thread_id, customer_email, customer_name, subject
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (gmail_connection_id, thread_id) 
      DO UPDATE SET 
        customer_name = COALESCE(EXCLUDED.customer_name, gmail_conversations.customer_name),
        subject = COALESCE(EXCLUDED.subject, gmail_conversations.subject),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [gmail_connection_id, thread_id, customer_email, customer_name, subject]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating/updating conversation:', error);
    throw error;
  }
}

export async function getConversation(gmail_connection_id, thread_id) {
  try {
    const result = await query(`
      SELECT * FROM gmail_conversations 
      WHERE gmail_connection_id = $1 AND thread_id = $2
    `, [gmail_connection_id, thread_id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting conversation:', error);
    throw error;
  }
}

export async function updateConversationActivity(conversation_id, message_type) {
  try {
    const timestamp_field = message_type === 'customer' ? 'last_customer_message_at' : 'last_ai_response_at';
    
    const result = await query(`
      UPDATE gmail_conversations 
      SET ${timestamp_field} = CURRENT_TIMESTAMP,
          total_messages = total_messages + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [conversation_id]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating conversation activity:', error);
    throw error;
  }
}

// Email Message Management
export async function saveGmailMessage(messageData) {
  try {
    const {
      conversation_id,
      gmail_message_id,
      thread_id,
      sender_type,
      sender_email,
      recipient_email,
      subject,
      content,
      content_type,
      in_reply_to,
      message_id_header,
      is_ai_generated,
      ai_model,
      sent_at
    } = messageData;
    
    const result = await query(`
      INSERT INTO gmail_messages (
        conversation_id, gmail_message_id, thread_id, sender_type,
        sender_email, recipient_email, subject, content, content_type,
        in_reply_to, message_id_header, is_ai_generated, ai_model, sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (gmail_message_id) DO NOTHING
      RETURNING *
    `, [
      conversation_id, gmail_message_id, thread_id, sender_type,
      sender_email, recipient_email, subject, content, content_type,
      in_reply_to, message_id_header, is_ai_generated, ai_model, sent_at
    ]);
    
    if (result.rows.length > 0) {
      console.log('✅ Gmail message saved to database');
      return result.rows[0];
    } else {
      console.log('ℹ️ Gmail message already exists in database');
      return null;
    }
  } catch (error) {
    console.error('❌ Error saving Gmail message:', error);
    throw error;
  }
}

export async function getConversationMessages(conversation_id, limit = 50) {
  try {
    const result = await query(`
      SELECT * FROM gmail_messages 
      WHERE conversation_id = $1 
      ORDER BY sent_at ASC
      LIMIT $2
    `, [conversation_id, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting conversation messages:', error);
    throw error;
  }
}

export async function getMessageByGmailId(gmail_message_id) {
  try {
    const result = await query(
      'SELECT * FROM gmail_messages WHERE gmail_message_id = $1',
      [gmail_message_id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting message by Gmail ID:', error);
    throw error;
  }
}

// AI Response Logging
export async function logAIResponse(logData) {
  try {
    const {
      gmail_connection_id,
      conversation_id,
      customer_message,
      ai_response,
      model_used,
      temperature,
      response_time_ms,
      tokens_used,
      cost_estimate
    } = logData;
    
    const result = await query(`
      INSERT INTO ai_response_logs (
        gmail_connection_id, conversation_id, customer_message, ai_response,
        model_used, temperature, response_time_ms, tokens_used, cost_estimate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      gmail_connection_id, conversation_id, customer_message, ai_response,
      model_used, temperature, response_time_ms, tokens_used, cost_estimate
    ]);
    
    console.log('✅ AI response logged to database');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error logging AI response:', error);
    throw error;
  }
}

// Analytics and Reporting
export async function getConnectionStats(user_id) {
  try {
    const result = await query(`
      SELECT 
        gc.email,
        gc.connected_at,
        COUNT(DISTINCT gcv.id) as total_conversations,
        COUNT(DISTINCT gm.id) as total_messages,
        COUNT(DISTINCT CASE WHEN gm.is_ai_generated = true THEN gm.id END) as ai_responses,
        MAX(gcv.last_customer_message_at) as last_activity
      FROM gmail_connections gc
      LEFT JOIN gmail_conversations gcv ON gc.id = gcv.gmail_connection_id
      LEFT JOIN gmail_messages gm ON gcv.id = gm.conversation_id
      WHERE gc.user_id = $1 AND gc.status = 'connected'
      GROUP BY gc.id, gc.email, gc.connected_at
      ORDER BY gc.connected_at DESC
    `, [user_id]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting connection stats:', error);
    throw error;
  }
}

export async function getRecentConversations(user_id, limit = 10) {
  try {
    const result = await query(`
      SELECT 
        gcv.*,
        gc.email as gmail_account,
        COUNT(gm.id) as message_count,
        MAX(gm.sent_at) as last_message_at
      FROM gmail_conversations gcv
      JOIN gmail_connections gc ON gcv.gmail_connection_id = gc.id
      LEFT JOIN gmail_messages gm ON gcv.id = gm.conversation_id
      WHERE gc.user_id = $1 AND gc.status = 'connected'
      GROUP BY gcv.id, gc.email
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT $2
    `, [user_id, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting recent conversations:', error);
    throw error;
  }
}
