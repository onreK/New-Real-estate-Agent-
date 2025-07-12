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
    let customer = null;
    
    try {
      customer = await getCustomerByClerkId(userId);
    } catch (customerError) {
      console.log('⚠️ Customer lookup failed:', customerError.message);
    }
    
    if (!customer) {
      console.log('👤 Creating customer record for existing user:', userId);
      
      try {
        // Create customer if they don't exist (fallback for existing users)
        const customerData = {
          clerk_user_id: userId,
          email: '', // Will be updated from Clerk user data if needed
          business_name: 'My Business', // Default business name
          plan: 'basic' // Using 'plan' field from Postgres schema
        };
        
        customer = await createCustomer(customerData);
        console.log('✅ Created new customer for existing Clerk user:', customer?.id);
      } catch (createError) {
        console.log('❌ Could not create customer:', createError.message);
        // Return fallback data if customer creation fails
        return NextResponse.json({
          success: true,
          customer: {
            id: 'temp_customer',
            name: 'My Business',
            email: '',
            subscription_tier: 'basic',
            subscription_status: 'active'
          },
          stats: {
            total_conversations: 0,
            total_messages: 0,
            total_hot_leads: 0,
            hot_leads_today: 0,
            conversations_today: 0,
            messages_today: 0
          },
          conversations: [],
          hotLeads: [],
          message: 'Database initialization required'
        });
      }
    }

    console.log('👤 Found customer:', { 
      id: customer?.id, 
      business_name: customer?.business_name, 
      email: customer?.email,
      plan: customer?.plan 
    });

    // Initialize default values
    let stats = {
      total_conversations: 0,
      total_messages: 0,
      total_hot_leads: 0,
      hot_leads_today: 0,
      conversations_today: 0,
      messages_today: 0
    };
    let conversations = [];
    let hotLeads = [];

    // Try to get user-specific stats with error handling
    try {
      stats = await getCustomerStats(customer.id);
      console.log('✅ Got customer stats:', stats);
    } catch (statsError) {
      console.log('⚠️ Stats query failed (using defaults):', statsError.message);
    }
    
    // Try to get user-specific conversations with error handling
    try {
      conversations = await getConversationsByCustomer(customer.id);
      console.log('✅ Got conversations:', conversations.length);
    } catch (conversationsError) {
      console.log('⚠️ Conversations query failed (using empty array):', conversationsError.message);
    }
    
    // Try to get user-specific hot leads with error handling
    try {
      hotLeads = await getHotLeadsByCustomer(customer.id);
      console.log('✅ Got hot leads:', hotLeads.length);
    } catch (hotLeadsError) {
      console.log('⚠️ Hot leads query failed (using empty array):', hotLeadsError.message);
    }

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
    
    // Return a safe fallback response
    return NextResponse.json({
      success: true,
      customer: {
        id: 'temp_customer',
        name: 'My Business',
        email: '',
        subscription_tier: 'basic',
        subscription_status: 'active'
      },
      stats: {
        total_conversations: 0,
        total_messages: 0,
        total_hot_leads: 0,
        hot_leads_today: 0,
        conversations_today: 0,
        messages_today: 0
      },
      conversations: [],
      hotLeads: [],
      error: 'Database connection issue - please run database fix',
      message: 'Using fallback data'
    });
  }
}
