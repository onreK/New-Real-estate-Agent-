// app/api/customer/profile/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId 
} from '@/lib/database';

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    console.log(`✅ Retrieved profile for customer: ${customer.business_name}`);
    
    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        clerk_user_id: customer.clerk_user_id,
        email: customer.email,
        business_name: customer.business_name,
        plan: customer.plan,
        stripe_customer_id: customer.stripe_customer_id,
        stripe_subscription_id: customer.stripe_subscription_id,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error getting customer profile:', error);
    return NextResponse.json({ 
      error: 'Failed to get customer profile',
      details: error.message 
    }, { status: 500 });
  }
}
