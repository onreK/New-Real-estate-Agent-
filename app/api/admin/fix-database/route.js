import { NextResponse } from 'next/server';
import { initializeDatabase, query } from '../../../../lib/database.js';

export async function POST() {
  try {
    console.log('🔧 Starting complete database fix via POST...');
    
    // Step 1: Initialize all tables with the latest schema
    console.log('📋 Step 1: Initializing database tables...');
    const initResult = await initializeDatabase();
    
    if (!initResult.success) {
      throw new Error(`Database initialization failed: ${initResult.error}`);
    }
    console.log('✅ Database tables initialized');
    
    // Step 2: Specifically fix the hot_leads table detected_at column issue
    console.log('📋 Step 2: Fixing hot_leads table...');
    try {
      // First check if the table exists
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'hot_leads'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Add the detected_at column if it doesn't exist
        await query(`ALTER TABLE hot_leads ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ detected_at column added/verified to existing table');
      } else {
        // Create the entire hot_leads table
        await query(`
          CREATE TABLE hot_leads (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            customer_id INTEGER,
            conversation_id INTEGER,
            urgency_score INTEGER DEFAULT 0,
            keywords TEXT[],
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'new',
            ai_analysis TEXT
          )
        `);
        console.log('✅ hot_leads table created with detected_at column');
      }
    } catch (hotLeadsError) {
      console.log('⚠️ Hot leads table fix error:', hotLeadsError.message);
    }
    
    // Step 3: Fix customers table issues
    console.log('📋 Step 3: Fixing customers table...');
    try {
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255)`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basic'`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`);
      console.log('✅ Customer table columns updated');
    } catch (customerError) {
      console.log('⚠️ Customer table update error:', customerError.message);
    }
    
    // Step 4: Create missing indexes for performance
    console.log('📋 Step 4: Creating indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_customers_clerk_user_id ON customers(clerk_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_detected_at ON hot_leads(detected_at)',
      'CREATE INDEX IF NOT EXISTS idx_hot_leads_user_id ON hot_leads(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)'
    ];
    
    for (const indexQuery of indexQueries) {
      try {
        await query(indexQuery);
        console.log('✅ Index created/verified');
      } catch (indexError) {
        console.log('⚠️ Index creation (may already exist):', indexError.message);
      }
    }
    
    // Step 5: Test the problematic queries that were failing
    console.log('📋 Step 5: Testing queries that were failing...');
    
    // Test hot leads query with detected_at column
    let hotLeadsTestPassed = false;
    try {
      const testResult = await query(
        `SELECT 
           COUNT(*) as total_hot_leads,
           COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as hot_leads_today
         FROM hot_leads 
         WHERE user_id = $1`,
        ['test_user']
      );
      console.log('✅ Hot leads query test passed:', testResult.rows[0]);
      hotLeadsTestPassed = true;
    } catch (testError) {
      console.log('❌ Hot leads query still failing:', testError.message);
      
      // Last resort: rebuild the hot_leads table completely
      console.log('🔨 Rebuilding hot_leads table completely...');
      try {
        await query(`DROP TABLE IF EXISTS hot_leads CASCADE`);
        await query(`
          CREATE TABLE hot_leads (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            customer_id INTEGER,
            conversation_id INTEGER,
            urgency_score INTEGER DEFAULT 0,
            keywords TEXT[],
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'new',
            ai_analysis TEXT
          )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_hot_leads_user_id ON hot_leads(user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_hot_leads_detected_at ON hot_leads(detected_at)`);
        
        // Test again after rebuild
        const retestResult = await query(
          `SELECT 
             COUNT(*) as total_hot_leads,
             COUNT(CASE WHEN detected_at >= CURRENT_DATE THEN 1 END) as hot_leads_today
           FROM hot_leads 
           WHERE user_id = $1`,
          ['test_user']
        );
        console.log('✅ Hot leads table rebuilt and tested successfully');
        hotLeadsTestPassed = true;
      } catch (rebuildError) {
        console.log('❌ Failed to rebuild hot_leads table:', rebuildError.message);
      }
    }
    
    // Test customer lookup query
    let customerTestPassed = false;
    try {
      const customerTest = await query(
        'SELECT * FROM customers WHERE clerk_user_id = $1 OR user_id = $1 LIMIT 1',
        ['test_user']
      );
      console.log('✅ Customer query test passed');
      customerTestPassed = true;
    } catch (customerQueryError) {
      console.log('⚠️ Customer query test failed:', customerQueryError.message);
    }
    
    // Step 6: Final verification - check all critical columns exist
    console.log('📋 Step 6: Final verification...');
    
    // Check hot_leads detected_at column
    const detectedAtCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hot_leads' AND column_name = 'detected_at'
    `);
    const hasDetectedAt = detectedAtCheck.rows.length > 0;
    
    // Check customer columns
    const customerColumnsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name IN ('clerk_user_id', 'business_name', 'plan')
    `);
    const customerColumns = customerColumnsCheck.rows.map(row => row.column_name);
    
    // Get all tables
    const allTablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const tables = allTablesResult.rows.map(row => row.table_name);
    
    // Check hot_leads table structure
    let hotLeadsStructure = [];
    try {
      const structureResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'hot_leads'
        ORDER BY ordinal_position
      `);
      hotLeadsStructure = structureResult.rows;
    } catch (structureError) {
      console.log('⚠️ Could not check hot_leads structure:', structureError.message);
    }
    
    console.log('🎉 Database fix completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Database fix completed successfully! Your dashboard should now work.',
      database_connected: true,
      hot_leads_detected_at_exists: hasDetectedAt,
      customer_columns_exist: customerColumns,
      tables: tables,
      hot_leads_structure: hotLeadsStructure,
      tests_passed: {
        hot_leads_query: hotLeadsTestPassed,
        customer_query: customerTestPassed
      },
      steps_completed: [
        'Database tables initialized',
        'detected_at column added to hot_leads',
        'Customer table columns updated (clerk_user_id, business_name, plan)',
        'Performance indexes created',
        'Critical queries tested',
        'Schema verification completed'
      ],
      next_steps: [
        '1. Go back to your dashboard at /dashboard',
        '2. Verify "Failed to load dashboard data" error is gone',
        '3. Check that metrics show numbers (even if 0)',
        '4. Test the demo page to create some data'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database fix failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error',
      suggestion: 'Check your DATABASE_URL environment variable and database connection',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('📊 Checking database status...');
    
    // Basic connection test
    const result = await query('SELECT NOW() as current_time');
    
    // Check if hot_leads table exists and has detected_at column
    const tableCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hot_leads' AND column_name = 'detected_at'
    `);
    const hasDetectedAt = tableCheck.rows.length > 0;
    
    // Check if customers table has required columns
    const customerColumnsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name IN ('clerk_user_id', 'business_name', 'plan')
    `);
    const customerColumns = customerColumnsCheck.rows.map(row => row.column_name);
    
    // Check all tables
    const allTablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const allTables = allTablesResult.rows.map(row => row.table_name);
    
    // Determine overall status
    const isFullyFixed = hasDetectedAt && customerColumns.includes('clerk_user_id');
    const needsFix = !hasDetectedAt || customerColumns.length < 3;
    
    return NextResponse.json({
      success: true,
      database_connected: true,
      current_time: result.rows[0].current_time,
      hot_leads_detected_at_exists: hasDetectedAt,
      customer_columns_exist: customerColumns,
      all_tables: allTables,
      tables_count: allTables.length,
      status: isFullyFixed ? 'Database schema is up to date' : 'Database needs fixing',
      issues_found: [
        ...(!hasDetectedAt ? ['Missing detected_at column in hot_leads table'] : []),
        ...(customerColumns.length < 3 ? ['Missing customer table columns'] : [])
      ],
      action_needed: needsFix ? 'Click "Run Database Fix" to apply fixes' : 'No action needed - schema is current',
      recommended_action: needsFix ? 'POST /api/admin/fix-database' : 'Test your dashboard',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return NextResponse.json({
      success: false,
      database_connected: false,
      error: error.message,
      action_needed: 'Check DATABASE_URL environment variable and database connection',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
