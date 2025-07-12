// app/api/instagram/configure/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { getCustomerByClerkId, createCustomer } from '../../../../lib/database.js';

// In-memory storage for Instagram configurations (replace with database in production)
const instagramConfigs = new Map();

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken, pageId, businessName, welcomeMessage, personality, aiModel } = await request.json();

    if (!accessToken || !pageId) {
      return NextResponse.json({ 
        error: 'Access token and page ID are required' 
      }, { status: 400 });
    }

    console.log('📸 Configuring Instagram for user:', user.id);

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
      customer = await getCustomerByClerkId(user.id);
      
      if (!customer) {
        console.log('👤 Creating customer record for Instagram user:', user.id);
        
        customer = await createCustomer({
          clerk_user_id: user.id,
          email: user.emailAddresses?.[0]?.emailAddress || '',
          business_name: businessName || 'My Business',
          plan: 'basic'
        });
      }
    } catch (dbError) {
      console.log('⚠️ Database not available, proceeding without customer record');
      customer = { id: 'temp_customer', business_name: businessName || 'My Business' };
    }

    // Store Instagram configuration
    const config = {
      userId: user.id,
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

    instagramConfigs.set(user.id, config);

    console.log('✅ Instagram configuration saved for user:', user.id);

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
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = instagramConfigs.get(user.id);
    
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
      error: 'Failed to get Instagram configuration'
    }, { status: 500 });
  }
}

// Helper function to get config by page ID (for webhook use)
export function getInstagramConfigByPageId(pageId) {
  for (const config of instagramConfigs.values()) {
    if (config.pageId === pageId) {
      return config;
    }
  }
  return null;
}

// Helper function to get all configs (for status checking)
export function getAllInstagramConfigs() {
  return Array.from(instagramConfigs.entries());
}
