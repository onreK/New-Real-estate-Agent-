// app/api/customer/email-messages/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getEmailMessages 
} from '../../../../lib/database';

export async function GET(request) {
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

    // Get conversation ID from query parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Get messages for this email conversation
    const messages = await getEmailMessages(parseInt(conversationId));
    
    console.log(`✅ Retrieved ${messages.length} email messages for conversation ${conversationId}`);
    
    return NextResponse.json({
      success: true,
      messages,
      conversationId: parseInt(conversationId)
    });

  } catch (error) {
    console.error('❌ Error getting email messages:', error);
    return NextResponse.json({ 
      error: 'Failed to get email messages',
      details: error.message 
    }, { status: 500 });
  }
}
