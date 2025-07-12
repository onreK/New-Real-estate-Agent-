import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs';
import { getCustomerByClerkId, createCustomer } from '../../../../lib/database.js';

export async function POST() {
  try {
    console.log('🧪 Creating test customer...');
    
    let userId = null;
    let userEmail = '';
    let userName = 'Test User';

    // Try both auth methods to get user ID
    try {
      const authResult = auth();
      userId = authResult?.userId;
      console.log('Auth method 1 userId:', userId);
    } catch (error) {
      console.log('Auth method 1 failed, trying method 2...');
    }

    try {
      const user = await currentUser();
      if (user) {
        userId = user.id;
        userEmail = user.emailAddresses?.[0]?.emailAddress || '';
        userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Test User';
        console.log('Auth method 2 userId:', userId);
      }
    } catch (error) {
      console.log('Auth method 2 also failed:', error.message);
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated',
        details: 'Could not get user ID from either auth method'
      }, { status: 401 });
    }

    // Check if customer already exists
    const existingCustomer = await getCustomerByClerkId(userId);
    
    if (existingCustomer) {
      console.log('✅ Customer already exists:', existingCustomer.id);
      return NextResponse.json({
        success: true,
        message: 'Customer already exists!',
        customer: existingCustomer,
        alreadyExisted: true
      });
    }

    // Create new customer
    const customerData = {
      clerk_user_id: userId,
      email: userEmail,
      business_name: `${userName}'s Business` || 'My Business',
      plan: 'basic'
    };

    console.log('Creating customer with data:', customerData);
    
    const newCustomer = await createCustomer(customerData);
    
    if (!newCustomer) {
      throw new Error('Customer creation returned null');
    }

    console.log('✅ Test customer created successfully:', newCustomer.id);

    return NextResponse.json({
      success: true,
      message: 'Test customer created successfully! 🎉',
      customer: newCustomer,
      next_steps: [
        'Customer record created in database',
        'You should now be able to access the dashboard',
        'Try testing the APIs again'
      ]
    });

  } catch (error) {
    console.error('❌ Create test customer error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create test customer',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to create test customer',
    instructions: [
      '1. Send a POST request to this endpoint',
      '2. Make sure you are logged in with Clerk',
      '3. This will create a customer record for your user'
    ]
  });
}
