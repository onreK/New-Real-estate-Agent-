// In your app/api/chat/route.js file, find the GET function and update it:

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    console.log('💬 Chat GET request, action:', action);

    // Support both 'test' and 'test-connection' for compatibility
    if (action === 'test' || action === 'test-connection') {
      // Test OpenAI connection
      try {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY not found in environment variables');
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
        });
        
        console.log('✅ OpenAI connection test successful');
        return NextResponse.json({ 
          connected: true, 
          message: 'OpenAI Connected Successfully!',
          model: 'gpt-4o-mini',
          database: dbAvailable ? 'Available' : 'Not Available'
        });
      } catch (error) {
        console.log('❌ OpenAI connection test failed:', error.message);
        return NextResponse.json({ 
          connected: false, 
          error: error.message 
        });
      }
    }

    if (action === 'conversations') {
      const { userId } = auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!dbAvailable) {
        return NextResponse.json({
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          message: 'Database not available'
        });
      }

      try {
        const customer = await db.getCustomerByClerkId(userId);
        
        if (!customer) {
          return NextResponse.json({
            conversations: [],
            totalConversations: 0,
            totalMessages: 0,
            leadsGenerated: 0
          });
        }

        const conversations = await db.getConversationsByCustomer(customer.id);
        const stats = await db.getCustomerStats(customer.id);

        return NextResponse.json({
          conversations,
          totalConversations: stats.total_conversations || 0,
          totalMessages: stats.total_messages || 0,
          leadsGenerated: stats.total_hot_leads || 0
        });

      } catch (dbError) {
        console.error('❌ Database error in conversations:', dbError);
        return NextResponse.json({
          conversations: [],
          totalConversations: 0,
          totalMessages: 0,
          leadsGenerated: 0,
          error: 'Database error'
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Chat GET API Error:', error);
    
    return NextResponse.json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
