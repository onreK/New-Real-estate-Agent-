// app/api/customer/email-connections/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getEmailConnections 
} from '../../../../lib/database.js';  // Fixed import path with .js extension

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic';

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

    // Get email connections for this user
    // The function expects user_id, not customer_id
    const connections = await getEmailConnections(user.id);
    
    console.log(`✅ Retrieved ${connections.length} email connections for user`);
    
    return NextResponse.json({
      success: true,
      connections,
      count: connections.length
    });

  } catch (error) {
    console.error('❌ Error getting email connections:', error);
    return NextResponse.json({ 
      error: 'Failed to get email connections',
      details: error.message 
    }, { status: 500 });
  }
}
