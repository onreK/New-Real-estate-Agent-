import { NextResponse } from 'next/server';
import { initializeDatabase } from '../../../lib/database.js';

export async function GET(request) {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found');
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not found',
        message: 'Please ensure your PostgreSQL database is connected',
        debug_info: {
          has_database_url: false,
          node_env: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    console.log('🔗 DATABASE_URL found, attempting connection...');
    console.log('🔗 Database URL preview:', process.env.DATABASE_URL.substring(0, 20) + '...');

    // Initialize the database
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
            'ai_configs', // Added this - it was missing!
            'business_profiles', // Added this too
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
            '✅ AI configuration storage', // Added this
            '✅ Email automation',
            '✅ Business profiles',
            '✅ Customer analytics',
            '✅ Message history tracking'
          ]
        },
        next_steps: [
          '1. Configure AI at /ai-config',
          '2. Test your web chat at /demo',
          '3. Send message: "I want to buy a house today"',
          '4. Check for hot lead detection',
          '5. Verify messages save to database'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error || 'Database initialization failed');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown database error',
      details: {
        error_type: error.code || 'unknown',
        error_detail: error.detail || 'No additional details',
        error_hint: error.hint || 'Check your database connection',
        suggestion: 'Verify DATABASE_URL is correct and database is accessible',
        debug_info: {
          has_database_url: !!process.env.DATABASE_URL,
          database_url_preview: process.env.DATABASE_URL ? 
            process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set',
          error_code: error.code,
          error_position: error.position,
          node_env: process.env.NODE_ENV
        }
      },
      troubleshooting: [
        '1. Check if DATABASE_URL is properly set in Railway',
        '2. Ensure PostgreSQL service is running',
        '3. Verify database connection permissions',
        '4. Try redeploying the application'
      ],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  // Same as GET - allow both methods for convenience
  return GET(request);
}
