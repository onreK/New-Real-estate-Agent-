import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getCustomerByClerkId,
  getSmsConversationsByCustomer,
  getSmsMessagesByCustomer,
  createCustomer
} from '../../../../lib/database.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📱 SMS API called for user:', userId);

    // Get or create customer record for this Clerk user
    let customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      console.log('👤 Creating customer record for SMS user:', userId);
      
      // Use Postgres-compatible customer data structure
      const customerData = {
        clerk_user_id: userId,
        email: '',
        business_name: 'My Business',
        plan: 'basic'
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for SMS user:', customer.id);
    }

    // Get user-specific SMS data
    const conversations = await getSmsConversationsByCustomer(customer.id);
    const messages = await getSmsMessagesByCustomer(customer.id);

    console.log('📱 SMS Dashboard Data:', {
      conversations: conversations.length,
      totalMessages: messages.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      leads: conversations.filter(c => c.leadCaptured).length
    });

    return NextResponse.json({
      success: true,
      conversations: conversations,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      leads: conversations.filter(c => c.leadCaptured).length,
      customer: {
        id: customer.id,
        name: customer.business_name || 'My Business'
      }
    });

  } catch (error) {
    console.error('❌ SMS API Error:', error);
    
    // More detailed error logging for debugging
    if (error.code) {
      console.error('Database Error Code:', error.code);
    }
    if (error.detail) {
      console.error('Database Error Detail:', error.detail);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to load SMS data',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
