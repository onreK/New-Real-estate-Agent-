// app/api/customer/email-conversations/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getEmailConversationsByCustomer 
} from '../../../../lib/database';

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

    // Get email conversations for this customer
    const conversations = await getEmailConversationsByCustomer(customer.id);
    
    console.log(`✅ Retrieved ${conversations.length} email conversations for customer ${customer.business_name}`);
    
    return NextResponse.json({
      success: true,
      conversations,
      customer: {
        id: customer.id,
        business_name: customer.business_name,
        email: customer.email
      }
    });

  } catch (error) {
    console.error('❌ Error getting email conversations:', error);
    return NextResponse.json({ 
      error: 'Failed to get email conversations',
      details: error.message 
    }, { status: 500 });
  }
}
