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

    // Initialize the database
    const result = await initializeDatabase();
    
    console.log('✅ Database initialization completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully! 🎉',
      details: {
        tables_created: [
          'customers',
          'phone_numbers', 
          'ai_configs',
          'conversations',
          'messages',
          'hot_lead_alerts',
          'leads',
          'usage_logs'
        ],
        indexes_created: [
          'Performance indexes for all major queries'
        ],
        features_ready: [
          '✅ Multi-tenant customer isolation',
          '✅ Web chat & SMS conversations',
          '✅ Hot lead detection & alerts',
          '✅ Lead tracking & analytics',
          '✅ Usage-based billing support',
          '✅ AI configuration per customer'
        ]
      },
      next_steps: [
        '1. Test your web chat at /demo',
        '2. Test SMS functionality',
        '3. Set up Stripe integration',
        '4. Start onboarding customers!'
      ]
    });

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        error_type: error.code || 'unknown',
        suggestion: 'Check your DATABASE_URL and database connection'
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  // Same as GET - allow both methods for convenience
  return GET(request);
}
