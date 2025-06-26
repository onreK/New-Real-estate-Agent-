import { NextResponse } from 'next/server';
import { getDbClient, createCustomer } from '../../../lib/database.js';

export async function GET(request) {
  try {
    console.log('🧪 Creating demo customer...');
    
    // Check if demo customer already exists
    const client = await getDbClient();
    const existingCustomer = await client.query(`
      SELECT * FROM customers WHERE id = 1
    `);

    if (existingCustomer.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Demo customer already exists!',
        customer: existingCustomer.rows[0]
      });
    }

    // Create demo customer
    const demoCustomer = await createCustomer({
      clerk_user_id: 'demo_user_123',
      email: 'demo@testrealestate.com',
      business_name: 'Test Real Estate Co',
      plan: 'basic'
    });

    console.log('✅ Demo customer created:', demoCustomer);

    return NextResponse.json({
      success: true,
      message: 'Demo customer created successfully! 🎉',
      customer: demoCustomer,
      next_steps: [
        'Now your hot lead detection will store data in the database!',
        'Test by going to /demo and saying "I want to buy a house today"'
      ]
    });

  } catch (error) {
    console.error('❌ Error creating demo customer:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
