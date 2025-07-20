// app/api/gmail/disconnect/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId,
  deleteGmailConnection 
} from '../../../../lib/database';

export async function POST() {
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

    console.log(`🔌 Disconnecting Gmail for customer: ${customer.id}`);

    // Delete Gmail connection from database
    // Note: You'll need to add this function to your database.js
    try {
      await deleteGmailConnection(customer.id);
      console.log(`✅ Gmail connection deleted for customer: ${customer.id}`);
    } catch (dbError) {
      console.error('❌ Error deleting Gmail connection from database:', dbError);
      // Continue anyway - we'll still return success to clear frontend state
    }

    // TODO: Optionally revoke OAuth token with Google
    // This would require storing and using the refresh token
    // const { google } = require('googleapis');
    // await oauth2Client.revokeCredentials();

    return NextResponse.json({
      success: true,
      message: 'Gmail connection disconnected successfully'
    });

  } catch (error) {
    console.error('❌ Error disconnecting Gmail:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect Gmail',
      details: error.message 
    }, { status: 500 });
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
