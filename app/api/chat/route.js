// GET endpoint for dashboard data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('📊 Dashboard API called with action:', action);

    // Handle test-connection action
    if (action === 'test-connection') {
      console.log('🧪 Testing OpenAI connection...');
      
      if (!openai) {
        return NextResponse.json({
          connected: false,
          error: 'OpenAI client not initialized',
          hasApiKey: !!process.env.OPENAI_API_KEY
        });
      }

      try {
        // Test OpenAI with a simple completion
        const testCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        });

        return NextResponse.json({
          connected: true,
          model: 'gpt-4o-mini',
          usage: testCompletion.usage,
          timestamp: new Date().toISOString()
        });
      } catch (testError) {
        console.error('OpenAI connection test failed:', testError);
        return NextResponse.json({
          connected: false,
          error: testError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Handle conversations action
    if (action === 'conversations') {
      console.log('📋 Getting conversation data...');
      
      const dbStatus = await testDatabaseConnection();
      
      if (dbStatus.success) {
        try {
          const client = dbStatus.client;
          
          // Get conversation stats
          const conversationStats = await client.query(`
            SELECT 
              COUNT(DISTINCT c.id) as total_conversations,
              COUNT(CASE WHEN c.lead_captured = true THEN 1 END) as leads_generated,
              COALESCE(SUM(message_counts.msg_count), 0) as total_messages
            FROM conversations c
            LEFT JOIN (
              SELECT conversation_id, COUNT(*) as msg_count 
              FROM messages 
              WHERE customer_id = 1 
              GROUP BY conversation_id
            ) message_counts ON c.id = message_counts.conversation_id
            WHERE c.customer_id = 1 AND c.source = 'web_chat'
          `);

          // Get recent conversations with details
          const recentConversations = await client.query(`
            SELECT 
              c.id,
              c.conversation_key,
              c.source,
              c.lead_captured,
              c.hot_lead_score,
              c.created_at,
              c.updated_at,
              COUNT(m.id) as message_count,
              MAX(m.created_at) as last_message_at
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.customer_id = 1 AND c.source = 'web_chat'
            GROUP BY c.id, c.conversation_key, c.source, c.lead_captured, c.hot_lead_score, c.created_at, c.updated_at
            ORDER BY c.updated_at DESC
            LIMIT 10
          `);

          // Get hot lead alerts
          const hotLeadAlerts = await client.query(`
            SELECT 
              h.*,
              c.conversation_key
            FROM hot_lead_alerts h
            LEFT JOIN conversations c ON h.conversation_id = c.id
            WHERE h.customer_id = 1
            ORDER BY h.created_at DESC
            LIMIT 10
          `);

          const stats = conversationStats.rows[0];
          
          console.log('✅ Database conversation data retrieved:', {
            totalConversations: stats.total_conversations,
            totalMessages: stats.total_messages,
            leadsGenerated: stats.leads_generated,
            hotLeadAlerts: hotLeadAlerts.rows.length
          });

          return NextResponse.json({
            totalConversations: parseInt(stats.total_conversations) || 0,
            totalMessages: parseInt(stats.total_messages) || 0,
            leadsGenerated: parseInt(stats.leads_generated) || 0,
            conversations: recentConversations.rows.map(conv => ({
              id: conv.id,
              conversationKey: conv.conversation_key,
              source: conv.source,
              leadCaptured: conv.lead_captured,
              hotLeadScore: conv.hot_lead_score,
              messageCount: parseInt(conv.message_count) || 0,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              lastMessageAt: conv.last_message_at
            })),
            hotLeadAlerts: hotLeadAlerts.rows.map(alert => ({
              id: alert.id,
              conversationId: alert.conversation_id,
              conversationKey: alert.conversation_key,
              leadScore: alert.lead_score,
              messageContent: alert.message_content,
              reasoning: alert.ai_reasoning,
              urgency: alert.urgency,
              createdAt: alert.created_at
            })),
            databaseConnected: true
          });

        } catch (dbError) {
          console.error('Database conversation query error:', dbError);
          // Fall through to memory fallback
        }
      }

      // Fallback to memory storage
      console.log('📝 Using memory storage fallback');
      return NextResponse.json({
        totalConversations: memoryStorage.conversations.size,
        totalMessages: Array.from(memoryStorage.conversations.values())
          .reduce((total, conv) => total + conv.messages.length, 0),
        leadsGenerated: memoryStorage.hotLeads.length,
        conversations: Array.from(memoryStorage.conversations.entries()).map(([key, conv]) => ({
          id: key,
          conversationKey: key,
          source: 'web_chat',
          leadCaptured: conv.isHotLead,
          hotLeadScore: conv.hotLeadScore,
          messageCount: conv.messages.length,
          createdAt: conv.timestamp,
          updatedAt: conv.timestamp
        })),
        hotLeadAlerts: memoryStorage.hotLeads.map((lead, index) => ({
          id: index,
          conversationId: lead.conversationId,
          leadScore: lead.score,
          messageContent: lead.message,
          createdAt: lead.timestamp
        })),
        databaseConnected: false
      });
    }

    // Default action - return basic stats
    console.log('📊 Getting basic stats...');
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus.success) {
      try {
        const client = dbStatus.client;
        
        const stats = await client.query(`
          SELECT 
            COUNT(DISTINCT c.conversation_key) as total_conversations,
            COUNT(CASE WHEN c.lead_captured = true THEN 1 END) as leads_generated,
            COALESCE(SUM(message_counts.msg_count), 0) as total_messages
          FROM conversations c
          LEFT JOIN (
            SELECT conversation_id, COUNT(*) as msg_count 
            FROM messages 
            WHERE customer_id = 1 
            GROUP BY conversation_id
          ) message_counts ON c.id = message_counts.conversation_id
          WHERE c.customer_id = 1
        `);

        const hotLeads = await client.query(`
          SELECT COUNT(*) as hot_leads_count
          FROM hot_lead_alerts 
          WHERE customer_id = 1
        `);

        return NextResponse.json({
          success: true,
          databaseConnected: true,
          totalConversations: parseInt(stats.rows[0]?.total_conversations) || 0,
          leadsGenerated: parseInt(stats.rows[0]?.leads_generated) || 0,
          totalMessages: parseInt(stats.rows[0]?.total_messages) || 0,
          hotLeads: parseInt(hotLeads.rows[0]?.hot_leads_count) || 0
        });
      } catch (dbError) {
        console.error('Database basic stats error:', dbError);
      }
    }

    // Fallback to memory stats
    return NextResponse.json({
      success: true,
      databaseConnected: false,
      totalConversations: memoryStorage.conversations.size,
      leadsGenerated: memoryStorage.hotLeads.length,
      totalMessages: Array.from(memoryStorage.conversations.values())
        .reduce((total, conv) => total + conv.messages.length, 0),
      hotLeads: memoryStorage.hotLeads.length
    });

  } catch (error) {
    console.error('❌ Dashboard GET API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      databaseConnected: false
    }, { status: 500 });
  }
}
