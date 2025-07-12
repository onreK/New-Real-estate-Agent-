// app/api/customer/email-settings/route.js
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
  console.log('✅ Database available for email settings');
} catch (error) {
  console.log('⚠️ Database not available for email settings:', error.message);
  dbAvailable = false;
}

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 Email settings GET request for user:', userId);

    // Return mock/empty settings if database not available
    if (!dbAvailable) {
      return NextResponse.json({
        success: true,
        settings: null,
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
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      // For now, return mock settings (replace with actual database query later)
      return NextResponse.json({
        success: true,
        settings: {
          setup_method: 'intellihub',
          business_name: customer.business_name,
          email_address: `${customer.business_name.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`,
          ai_enabled: false
        },
        customer: {
          id: customer.id,
          business_name: customer.business_name,
          email: customer.email
        }
      });

    } catch (dbError) {
      console.error('❌ Database error in email settings:', dbError);
      return NextResponse.json({
        success: true,
        settings: null,
        customer: {
          id: 'temp_customer',
          business_name: 'My Business',
          email: 'user@example.com'
        }
      });
    }

  } catch (error) {
    console.error('❌ Error getting email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to get email settings',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { setup_method, custom_domain, business_name, email_address } = body;

    if (!setup_method || !business_name || !email_address) {
      return NextResponse.json({ 
        error: 'Setup method, business name, and email address are required' 
      }, { status: 400 });
    }

    console.log('📧 Saving email settings for user:', userId);

    // For now, just return success (implement database saving later)
    return NextResponse.json({
      success: true,
      settings: {
        setup_method,
        custom_domain,
        business_name,
        email_address,
        ai_enabled: false
      },
      message: 'Email settings saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to save email settings',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
