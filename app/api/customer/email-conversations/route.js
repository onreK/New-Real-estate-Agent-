import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Email conversations API called for user:', userId);

    // Return empty data structure for now
    // This will be populated when email integration is fully set up
    return NextResponse.json({
      success: true,
      conversations: [],
      customer: {
        id: 'temp_customer',
        business_name: 'My Business',
        email: 'user@example.com'
      }
    });

  } catch (error) {
    console.error('❌ Email conversations API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load email conversations',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
