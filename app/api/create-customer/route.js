// app/api/create-customer/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { getDbClient } from '../../../lib/database';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔨 Creating customer for user:', user.id);

    const client = await getDbClient().connect();
    try {
      // Check if customer already exists
      const existingCheck = await client.query('SELECT * FROM customers WHERE clerk_user_id = $1', [user.id]);
      
      if (existingCheck.rows.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Customer already exists',
          customer: existingCheck.rows[0]
        });
      }

      // Create new customer
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
      
      console.log('✅ Created customer:', result.rows[0]);
      
      return NextResponse.json({
        success: true,
        message: 'Customer created successfully!',
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
