// app/api/instagram/configure/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setInstagramConfig, getInstagramConfig } from '../../../../lib/instagram-config.js';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// Database import with fallback
let dbAvailable = false;
let db = {};

try {
  const database = await import('../../../../lib/database.js');
  db = database;
  dbAvailable = true;
  console.log('✅ Database available for Instagram configure');
} catch (error) {
  console.log('⚠️ Database not available for Instagram configure:', error.message);
  dbAvailable = false;
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken, pageId, businessName, welcomeMessage, personality, aiModel } = await request.json();

    if (!accessToken || !pageId) {
      return NextResponse.json({ 
        error: 'Access token and page ID are required' 
      }, { status: 400 });
    }

    console.log('📸 Configuring Instagram for user:', userId);

    // Test the Instagram access token
    try {
      const testResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}?access_token=${accessToken}`);
      
      if (!testResponse.ok) {
        return NextResponse.json({ 
          error: 'Invalid access token or page ID' 
        }, { status: 400 });
      }

      const pageInfo = await testResponse.json();
      console.log('✅ Instagram page verified:', pageInfo.name);
    } catch (error) {
      console.error('❌ Instagram API test failed:', error);
      return NextResponse.json({ 
        error: 'Failed to verify Instagram credentials' 
      }, { status: 400 });
    }

    // Get or create customer record
    let customer;
    try {
      if (dbAvailable && db.getCustomerByClerkId) {
        customer = await db.getCustomerByClerkId(userId);
        
        if (!customer && db.createCustomer) {
          console.log('👤 Creating customer record for Instagram user:', userId);
          
          customer = await db.createCustomer({
            clerk_user_id: userId,
            email: '',
            business_name: businessName || 'My Business',
            plan: 'basic'
          });
        }
      }
    } catch (dbError) {
      console.log('⚠️ Database error, proceeding without customer record:', dbError.message);
    }

    if (!customer) {
      customer = { id: 'temp_customer', business_name: businessName || 'My Business' };
    }

    // Store Instagram configuration
    const config = {
      userId: userId,
      customerId: customer.id,
      accessToken,
      pageId,
      businessName: businessName || customer.business_name,
      welcomeMessage: welcomeMessage || 'Hi! Thanks for messaging us on Instagram. How can we help you today?',
      personality: personality || 'friendly',
      aiModel: aiModel || 'gpt-4o-mini',
      configuredAt: new Date().toISOString(),
      active: true
    };

    setInstagramConfig(userId, config);

    console.log('✅ Instagram configuration saved for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Instagram AI configured successfully!',
      config: {
        pageId,
        businessName: config.businessName,
        welcomeMessage: config.welcomeMessage,
        personality: config.personality,
        aiModel: config.aiModel
      }
    });

  } catch (error) {
    console.error('❌ Instagram configuration error:', error);
    return NextResponse.json({
      error: 'Failed to configure Instagram integration',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getInstagramConfig(userId);
    
    if (!config) {
      return NextResponse.json({ 
        configured: false,
        message: 'No Instagram configuration found' 
      });
    }

    return NextResponse.json({
      configured: true,
      config: {
        pageId: config.pageId,
        businessName: config.businessName,
        welcomeMessage: config.welcomeMessage,
        personality: config.personality,
        aiModel: config.aiModel,
        configuredAt: config.configuredAt
      }
    });

  } catch (error) {
    console.error('❌ Get Instagram configuration error:', error);
    return NextResponse.json({
      error: 'Failed to get Instagram configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
