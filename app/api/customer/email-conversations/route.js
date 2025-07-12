// app/api/customer/email-conversations/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// Database import with fallback
let dbAvailable = false;
let db = {};

try {
  const database = await import('../../../../lib/database.js');
  db = database;
  dbAvailable = true;
  console.log('✅ Database available for email conversations');
} catch (error) {
  console.log('⚠️ Database not available for email conversations:', error.message);
  dbAvailable = false;
}

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Email conversations API called for user:', userId);

    // Return empty data structure if database not available
    if (!dbAvailable) {
      return NextResponse.json({
        success: true,
        conversations: [],
        customer: {
          id: 'temp_customer',
          business_name: 'My Business',
          email: 'user@example.com'
        }
      });
    }

    try {
      // Get customer from database
      const customer = await db.getCustomerByClerkId(userId);
      
      if (!customer) {
        console.log('👤 Creating customer record for email user:', userId);
        
        // Create customer if they don't exist
        const customerData = {
          clerk_user_id: userId,
          email: '',
          business_name: 'My Business',
          plan: 'basic'
        };
        
        const newCustomer = await db.createCustomer(customerData);
        console.log('✅ Created new customer for email user:', newCustomer.id);
        
        return NextResponse.json({
          success: true,
          conversations: [],
          customer: {
            id: newCustomer.id,
            business_name: newCustomer.business_name,
            email: newCustomer.email
          }
        });
      }

      // For now, return empty conversations (replace with actual email conversations later)
      return NextResponse.json({
        success: true,
        conversations: [],
        customer: {
          id: customer.id,
          business_name: customer.business_name,
          email: customer.email
        }
      });

    } catch (dbError) {
      console.error('❌ Database error in email conversations:', dbError);
      return NextResponse.json({
        success: true,
        conversations: [],
        customer: {
          id: 'temp_customer',
          business_name: 'My Business',
          email: 'user@example.com'
        }
      });
    }

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
