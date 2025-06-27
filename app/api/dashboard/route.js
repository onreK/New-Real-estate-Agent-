import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getCustomerByClerkId,
  getCustomerStats,
  getConversationsByCustomer,
  getHotLeadsByCustomer,
  createCustomer
} from '../../../lib/database.js';

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
        id: Date.now(),
        name: 'Customer', // Will be updated when they provide info
        email: '', // Will be updated from Clerk user data if needed
        phone: '',
        clerk_user_id: userId,
        created_at: new Date().toISOString(),
        subscription_tier: 'basic',
        subscription_status: 'trial'
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for existing Clerk user:', customer.id);
    }

    console.log('👤 Found customer:', { id: customer.id, name: customer.name, email: customer.email });

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
        name: customer.name,
        email: customer.email,
        subscription_tier: customer.subscription_tier,
        subscription_status: customer.subscription_status
      },
      stats,
      conversations,
      hotLeads
    });

  } catch (error) {
    console.error('❌ Dashboard API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
