import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getCustomerByClerkId,
  getCustomerStats,
  getConversationsByCustomer,
  getHotLeadsByCustomer,
  createCustomer
} from '../../../lib/database.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Dashboard API called for user:', userId);

    // Get or create customer record for this Clerk user
    let customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      console.log('👤 Creating customer record for existing user:', userId);
      
      // Create customer if they don't exist (fallback for existing users)
      const customerData = {
        clerk_user_id: userId,
        email: '', // Will be updated from Clerk user data if needed
        business_name: 'My Business', // Default business name
        plan: 'basic' // Using 'plan' field from Postgres schema
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for existing Clerk user:', customer.id);
    }

    console.log('👤 Found customer:', { 
      id: customer.id, 
      business_name: customer.business_name, 
      email: customer.email,
      plan: customer.plan 
    });

    // Get user-specific stats
    const stats = await getCustomerStats(customer.id);
    
    // Get user-specific conversations
    const conversations = await getConversationsByCustomer(customer.id);
    
    // Get user-specific hot leads
    const hotLeads = await getHotLeadsByCustomer(customer.id);

    console.log('📊 Dashboard stats for customer', customer.id, ':', stats);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.business_name || 'My Business', // Map business_name to name for frontend
        email: customer.email,
        subscription_tier: customer.plan || 'basic', // Map plan to subscription_tier for frontend
        subscription_status: 'active' // Default to active
      },
      stats,
      conversations,
      hotLeads
    });

  } catch (error) {
    console.error('❌ Dashboard API Error:', error);
    
    // More detailed error logging for debugging
    if (error.code) {
      console.error('Database Error Code:', error.code);
    }
    if (error.detail) {
      console.error('Database Error Detail:', error.detail);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard data',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
