import { NextResponse } from 'next/server';

// COMPLETELY PUBLIC - NO AUTH IMPORTS AT ALL

export async function GET(request) {
  try {
    console.log('🚀 Database setup requested (public endpoint)');
    
    // Check environment
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not configured'
      }, { status: 500 });
    }

    // Dynamic import to avoid any auth issues
    const { initializeDatabase, query } = await import('../../../lib/database.js');
    
    // Test connection
    try {
      await query('SELECT 1 as test');
      console.log('✅ Database connection successful');
    } catch (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message
      }, { status: 500 });
    }

    // Run initialization (safe - creates tables only if they don't exist)
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database verified successfully! 🎉',
        details: {
          tables_verified: [
            'customers',
            'conversations', 
            'messages',
            'hot_leads',
            'ai_configs', // ✅ This exists in your DB
            'business_profiles',
            'sms_conversations',
            'sms_messages',
            'email_settings',
            'email_conversations',
            'email_messages',
            'email_templates'
          ]
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error || 'Initialization failed');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Setup failed'
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
