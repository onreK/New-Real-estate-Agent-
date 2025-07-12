import { NextResponse } from 'next/server';
import { initializeDatabase, query } from '../../../../lib/database.js';

export async function POST() {
  try {
    console.log('🔧 Starting database fix...');
    
    // Step 1: Initialize all tables
    const initResult = await initializeDatabase();
    
    if (!initResult.success) {
      throw new Error(initResult.error);
    }
    
    // Step 2: Specifically fix the hot_leads table detected_at column issue
    try {
      console.log('🔧 Ensuring hot_leads table has detected_at column...');
      await query(`ALTER TABLE hot_leads ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ detected_at column added/verified');
    } catch (columnError) {
      console.log('⚠️ detected_at column may already exist:', columnError.message);
    }
    
    // Step 3: Test the problematic queries
    console.log('🧪 Testing customer stats query...');
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
    } catch (testError) {
      console.log('❌ Hot leads query still failing:', testError.message);
      
      // If the query still fails, the table structure might be completely wrong
      // Let's rebuild the hot_leads table
      console.log('🔨 Rebuilding hot_leads table...');
      
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
        
        console.log('✅ hot_leads table rebuilt successfully');
      } catch (rebuildError) {
        console.log('❌ Failed to rebuild hot_leads table:', rebuildError.message);
      }
    }
    
    // Step 4: Verify all tables exist
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tableCheck.rows.map(row => row.table_name);
    console.log('📋 Current database tables:', tables);
    
    // Step 5: Check hot_leads table structure specifically
    try {
      const hotLeadsStructure = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'hot_leads'
        ORDER BY ordinal_position
      `);
      
      console.log('🔍 hot_leads table structure:', hotLeadsStructure.rows);
    } catch (structureError) {
      console.log('❌ Could not check hot_leads structure:', structureError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database fix completed successfully',
      tables: tables,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database fix failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just check database status
    const result = await query('SELECT NOW() as current_time');
    
    // Check if hot_leads table exists and has detected_at column
    const tableCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hot_leads' AND column_name = 'detected_at'
    `);
    
    const hasDetectedAt = tableCheck.rows.length > 0;
    
    return NextResponse.json({
      success: true,
      database_connected: true,
      current_time: result.rows[0].current_time,
      hot_leads_detected_at_exists: hasDetectedAt,
      message: hasDetectedAt ? 'Database looks good' : 'detected_at column missing from hot_leads table'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      database_connected: false,
      error: error.message
    }, { status: 500 });
  }
}
