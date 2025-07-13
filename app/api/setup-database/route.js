import { NextResponse } from 'next/server';

// NO IMPORTS OF AUTH OR CLERK - COMPLETELY PUBLIC ENDPOINT

export async function GET(request) {
  try {
    console.log('🚀 Database setup requested - no auth required');
    
    // Check environment
    if (!process.env.DATABASE_URL) {
      console.log('❌ No DATABASE_URL found');
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not configured',
        message: 'Please set DATABASE_URL in your Railway environment variables'
      }, { status: 500 });
    }

    console.log('🔗 DATABASE_URL found, testing connection...');

    // Import database functions dynamically (no top-level imports)
    const { initializeDatabase, query } = await import('../../../lib/database.js');
    
    // Test basic connection
    try {
      await query('SELECT 1 as test');
      console.log('✅ Database connection successful');
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message,
        suggestion: 'Check your DATABASE_URL and PostgreSQL service status'
      }, { status: 500 });
    }

    // Initialize database
    console.log('🔧 Initializing database tables...');
    const result = await initializeDatabase();
    
    if (result.success) {
      console.log('✅ Database initialization completed');
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully! 🎉',
        details: {
          tables_verified: [
            'customers',
            'conversations', 
            'messages',
            'hot_leads',
            'ai_configs',
            'business_profiles',
            'sms_conversations',
            'sms_messages',
            'email_settings',
            'email_conversations',
            'email_messages',
            'email_templates'
          ],
          features_ready: [
            '✅ AI configuration storage',
            '✅ Customer management',
            '✅ Chat conversations',
            '✅ Hot lead detection',
            '✅ SMS messaging',
            '✅ Email automation'
          ]
        },
        next_steps: [
          '1. Go to /ai-config to set up your AI',
          '2. Test at /demo',
          '3. Configure business settings'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error || 'Database initialization failed');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Setup failed',
      debug: {
        has_database_url: !!process.env.DATABASE_URL,
        error_type: error.code || 'unknown',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
