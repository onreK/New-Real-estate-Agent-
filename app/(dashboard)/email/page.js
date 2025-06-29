// app/api/customer/stats/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getCustomerStats 
} from '@/lib/database';

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

    // Get comprehensive stats for this customer (includes email stats)
    const stats = await getCustomerStats(customer.id);
    
    console.log(`✅ Retrieved stats for customer ${customer.business_name}:`, stats);
    
    return NextResponse.json({
      success: true,
      stats,
      customer: {
        id: customer.id,
        business_name: customer.business_name,
        email: customer.email,
        plan: customer.plan
      }
    });

  } catch (error) {
    console.error('❌ Error getting customer stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get customer stats',
      details: error.message 
    }, { status: 500 });
  }
}
