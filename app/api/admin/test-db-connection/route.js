import { NextResponse } from 'next/server';
import { query, getDbClient } from '../../../../lib/database.js';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    const results = {
      connection: false,
      tables: {},
      functions: {},
      errors: []
    };

    // Test basic connection
    try {
      const client = await getDbClient().connect();
      client.release();
      results.connection = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      results.errors.push(`Connection failed: ${error.message}`);
      console.error('❌ Database connection failed:', error);
    }

    // Test if customers table exists and has correct structure
    try {
      const customerTableCheck = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        ORDER BY ordinal_position
      `);
      
      results.tables.customers = {
        exists: customerTableCheck.rows.length > 0,
        columns: customerTableCheck.rows,
        hasClerkUserId: customerTableCheck.rows.some(col => col.column_name === 'clerk_user_id')
      };
      
      console.log('✅ Customers table structure:', results.tables.customers);
    } catch (error) {
      results.errors.push(`Customers table check failed: ${error.message}`);
      results.tables.customers = { exists: false, error: error.message };
    }

    // Test if we can import the database functions
    try {
      const { getCustomerByClerkId, createCustomer, getCustomerStats } = await import('../../../../lib/database.js');
      
      results.functions = {
        getCustomerByClerkId: typeof getCustomerByClerkId === 'function',
        createCustomer: typeof createCustomer === 'function',
        getCustomerStats: typeof getCustomerStats === 'function'
      };
      
      console.log('✅ Database functions check:', results.functions);
    } catch (error) {
      results.errors.push(`Function import failed: ${error.message}`);
      results.functions = { error: error.message };
    }

    // Test creating a simple query
    try {
      const testQuery = await query('SELECT NOW() as current_time');
      results.queryTest = {
        success: true,
        currentTime: testQuery.rows[0]?.current_time
      };
      console.log('✅ Query test successful');
    } catch (error) {
      results.errors.push(`Query test failed: ${error.message}`);
      results.queryTest = { success: false, error: error.message };
    }

    return NextResponse.json({
      success: results.connection && results.errors.length === 0,
      message: results.connection ? 'Database tests completed' : 'Database connection failed',
      results
    });

  } catch (error) {
    console.error('❌ Database test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error.message
    }, { status: 500 });
  }
}
