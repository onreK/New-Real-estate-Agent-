// app/api/debug/customer-status/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getDbClient 
} from '../../../../lib/database';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔍 Debug: Checking customer status for user:', user.id);

    // Try to get customer
    let customer = null;
    try {
      customer = await getCustomerByClerkId(user.id);
    } catch (error) {
      console.log('❌ Error getting customer:', error.message);
    }

    // Check database directly
    const client = await getDbClient().connect();
    try {
      // Check if customers table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'customers'
        );
      `);
      
      // Get all customers
      const allCustomers = await client.query('SELECT id, clerk_user_id, business_name, email FROM customers LIMIT 10');
      
      // Check for user specifically
      const userCustomer = await client.query('SELECT * FROM customers WHERE clerk_user_id = $1', [user.id]);
      
      return NextResponse.json({
        success: true,
        debug_info: {
          user: {
            id: user.id,
            email: user.emailAddresses?.[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName
          },
          customer_found_via_function: !!customer,
          customer_data: customer,
          database_info: {
            customers_table_exists: tableCheck.rows[0].exists,
            total_customers: allCustomers.rows.length,
            all_customers: allCustomers.rows,
            user_customer_query: userCustomer.rows
          }
        }
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔨 Creating customer for user:', user.id);

    const client = await getDbClient().connect();
    try {
      // Create customer
      const businessName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}'s Business`
        : 'My Business';
      
      const email = user.emailAddresses?.[0]?.emailAddress || 'user@example.com';
      
      const insertQuery = `
        INSERT INTO customers (
          clerk_user_id, business_name, email, plan, 
          created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        user.id,
        businessName,
        email,
        'starter'
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        customer: result.rows[0]
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error creating customer:', error);
    return NextResponse.json({ 
      error: 'Failed to create customer',
      details: error.message 
    }, { status: 500 });
  }
}
