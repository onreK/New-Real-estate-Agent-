import { NextResponse } from 'next/server';
import { initializeDatabase } from '../../../lib/database.js';

// NO AUTHENTICATION REQUIRED for database setup
export async function GET(request) {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found');
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not found',
        message: 'Please ensure your PostgreSQL database is connected in Railway',
        debug_info: {
          has_database_url: false,
          node_env: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    console.log('🔗 DATABASE_URL found, testing connection...');
    
    // Test basic connection first
    try {
      const { query } = await import('../../../lib/database.js');
      await query('SELECT 1 as test');
      console.log('✅ Database connection test successful');
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message,
        troubleshooting: [
          '1. Check if DATABASE_URL is correct in Railway variables',
          '2. Ensure PostgreSQL service is running',
          '3. Verify database allows connections from your app',
          '4. Try restarting the PostgreSQL service'
        ]
      }, { status: 500 });
    }

    // Initialize the database
    console.log('🔧 Initializing database tables...');
    const result = await initializeDatabase();
    
    if (result.success) {
      console.log('✅ Database initialization completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully! 🎉',
        details: {
          tables_created: [
            'customers',
            'conversations', 
            'messages',
            'hot_leads',
            'ai_configs', // This is the key table for AI configuration
            'business_profiles',
            'sms_conversations',
            'sms_messages',
            'email_settings',
            'email_conversations',
            'email_messages',
            'email_templates'
          ],
          features_ready: [
            '✅ Multi-tenant customer isolation',
            '✅ Web chat conversations',
            '✅ Hot lead detection & alerts',
            '✅ SMS messaging support',
            '✅ AI configuration storage',
            '✅ Email automation',
            '✅ Business profiles',
            '✅ Customer analytics',
            '✅ Message history tracking'
          ]
        },
        next_steps: [
          '1. Go to /ai-config to configure your AI',
          '2. Test your web chat at /demo',
          '3. Send message: "I want to buy a house today"',
          '4. Check for hot lead detection'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error || 'Database initialization failed');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown database error',
      details: {
        error_type: error.code || 'unknown',
        error_detail: error.detail || error.message,
        error_hint: error.hint || 'Check your database connection',
        debug_info: {
          has_database_url: !!process.env.DATABASE_URL,
          database_url_preview: process.env.DATABASE_URL ? 
            process.env.DATABASE_URL.substring(0, 30) + '...' : 'Not set',
          error_code: error.code,
          node_env: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      },
      troubleshooting: [
        '1. Check Railway dashboard for PostgreSQL service status',
        '2. Verify DATABASE_URL variable is properly set',
        '3. Ensure database service has sufficient resources',
        '4. Try redeploying both database and app services'
      ]
    }, { status: 500 });
  }
}

export async function POST(request) {
  // Same as GET - allow both methods for convenience
  return GET(request);
}
