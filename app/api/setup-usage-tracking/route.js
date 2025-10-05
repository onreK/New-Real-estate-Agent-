import { NextResponse } from 'next/server';

// Lazy load database to prevent build errors
let getDbClient;

async function initializeDatabase() {
  if (!getDbClient) {
    const db = await import('@/lib/database');
    getDbClient = db.getDbClient;
  }
  return getDbClient;
}

export async function GET() {
  try {
    // Initialize database connection
    const getDbClient = await initializeDatabase();
    const client = await getDbClient().connect();
    
    try {
      console.log('🔧 Setting up usage tracking tables...');
      
      // 1. Create customer_usage table for tracking usage
      await client.query(`
        CREATE TABLE IF NOT EXISTS customer_usage (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          type VARCHAR(50) NOT NULL, -- 'conversation', 'email', 'sms'
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ customer_usage table ready');
      
      // 2. Add indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_usage_customer_id ON customer_usage(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customer_usage_type ON customer_usage(type);
        CREATE INDEX IF NOT EXISTS idx_customer_usage_created_at ON customer_usage(created_at);
      `);
      console.log('✅ Usage tracking indexes created');
      
      // 3. Update customers table to support Stripe
      await client.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS pending_promo_code VARCHAR(255);
      `);
      console.log('✅ customers table updated for discount codes');
      
      // 4. Create subscriptions table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          stripe_subscription_id VARCHAR(255) UNIQUE,
          plan VARCHAR(50) DEFAULT 'starter',
          status VARCHAR(50) DEFAULT 'trialing',
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          cancel_at_period_end BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ subscriptions table created/verified');
      
      // 5. Add index for subscriptions
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
      `);
      console.log('✅ subscriptions indexes created');
      
      return NextResponse.json({
        success: true,
        message: 'Usage tracking and subscription tables created successfully',
        tables: [
          'customer_usage - created/verified',
          'subscriptions - created/verified',
          'customers - updated with pending_promo_code'
        ]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error setting up usage tracking:', error);
    return NextResponse.json({
      error: 'Failed to setup usage tracking',
      details: error.message
    }, { status: 500 });
  }
}
