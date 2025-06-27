import { NextResponse } from 'next/server';
import { initializeDatabase } from '../../../lib/database.js';

export async function GET(request) {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not found',
        message: 'Please ensure your PostgreSQL database is connected'
      }, { status: 500 });
    }

    console.log('🔗 Database URL found, connecting...');

    // Initialize the database
    await initializeDatabase();
    
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
          'sms_conversations',
          'sms_messages'
        ],
        features_ready: [
          '✅ Multi-tenant customer isolation',
          '✅ Web chat conversations',
          '✅ Hot lead detection & alerts',
          '✅ SMS messaging support',
          '✅ Customer analytics',
          '✅ Message history tracking'
        ]
      },
      next_steps: [
        '1. Test your web chat at /demo',
        '2. Send message: "I want to buy a house today"',
        '3. Check for hot lead detection',
        '4. Verify messages save to database'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        error_type: error.code || 'unknown',
        error_detail: error.detail || 'No additional details',
        suggestion: 'Check your DATABASE_URL and database connection',
        debug_info: {
          has_database_url: !!process.env.DATABASE_URL,
          error_code: error.code,
          error_position: error.position
        }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  // Same as GET - allow both methods for convenience
  return GET(request);
}
