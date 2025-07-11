// app/api/facebook/configure/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId,
  createCustomer
} from '../../../../lib/database.js';

// In-memory storage for customer configurations (use database in production)
let facebookConfigs = new Map();

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      console.log('👤 Creating customer record for Facebook user:', user.id);
      
      const customerData = {
        clerk_user_id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || '',
        business_name: user.firstName && user.lastName ? 
          `${user.firstName} ${user.lastName}` : 'My Business',
        plan: 'basic'
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for Facebook user:', customer.id);
    }

    const { config } = await request.json();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration is required'
      }, { status: 400 });
    }

    // Validate required fields
    const requiredFields = ['businessName', 'pageAccessToken', 'verifyToken', 'appSecret'];
    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === '') {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }

    console.log('⚙️ Configuring Facebook Messenger AI for customer:', customer.id);

    // Create configuration object
    const facebookConfig = {
      customerId: customer.id,
      clerkUserId: user.id,
      businessName: config.businessName.trim(),
      industry: config.industry || 'General Business',
      personality: config.personality || 'professional',
      welcomeMessage: config.welcomeMessage || `Hi! I'm ${config.businessName}'s AI assistant. How can I help you today?`,
      responseStyle: config.responseStyle || 'helpful',
      enableHotLeadAlerts: config.enableHotLeadAlerts !== false,
      
      // Facebook credentials (in production, encrypt these)
      pageAccessToken: config.pageAccessToken.trim(),
      verifyToken: config.verifyToken.trim(),
      appSecret: config.appSecret.trim(),
      
      // Metadata
      configuredAt: new Date().toISOString(),
      status: 'active',
      platform: 'facebook_messenger'
    };

    // Store configuration using customer ID as key
    facebookConfigs.set(customer.id, facebookConfig);

    console.log('✅ Facebook Messenger AI configured successfully:', {
      customerId: customer.id,
      businessName: facebookConfig.businessName,
      personality: facebookConfig.personality,
      hotLeadAlerts: facebookConfig.enableHotLeadAlerts
    });

    // Return success response (don't include sensitive tokens)
    return NextResponse.json({
      success: true,
      config: {
        businessName: facebookConfig.businessName,
        industry: facebookConfig.industry,
        personality: facebookConfig.personality,
        welcomeMessage: facebookConfig.welcomeMessage,
        responseStyle: facebookConfig.responseStyle,
        enableHotLeadAlerts: facebookConfig.enableHotLeadAlerts,
        configuredAt: facebookConfig.configuredAt,
        status: facebookConfig.status
      }
    });

  } catch (error) {
    console.error('❌ Facebook Configuration Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to configure Facebook Messenger AI'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve current configuration
export async function GET(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    const config = facebookConfigs.get(customer.id);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'No Facebook configuration found'
      }, { status: 404 });
    }

    // Return configuration (excluding sensitive data)
    return NextResponse.json({
      success: true,
      config: {
        businessName: config.businessName,
        industry: config.industry,
        personality: config.personality,
        welcomeMessage: config.welcomeMessage,
        responseStyle: config.responseStyle,
        enableHotLeadAlerts: config.enableHotLeadAlerts,
        configuredAt: config.configuredAt,
        status: config.status,
        hasPageAccessToken: !!config.pageAccessToken,
        hasVerifyToken: !!config.verifyToken,
        hasAppSecret: !!config.appSecret
      }
    });

  } catch (error) {
    console.error('❌ Facebook Configuration Retrieval Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve configuration'
    }, { status: 500 });
  }
}

// PUT endpoint to update configuration
export async function PUT(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    const { updates } = await request.json();

    if (!updates) {
      return NextResponse.json({
        success: false,
        error: 'Updates are required'
      }, { status: 400 });
    }

    const existingConfig = facebookConfigs.get(customer.id);
    
    if (!existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'No existing configuration found. Please complete initial setup first.'
      }, { status: 404 });
    }

    console.log('🔄 Updating Facebook configuration for customer:', customer.id);

    // Update configuration
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    facebookConfigs.set(customer.id, updatedConfig);

    console.log('✅ Facebook configuration updated successfully');

    return NextResponse.json({
      success: true,
      config: {
        businessName: updatedConfig.businessName,
        industry: updatedConfig.industry,
        personality: updatedConfig.personality,
        welcomeMessage: updatedConfig.welcomeMessage,
        responseStyle: updatedConfig.responseStyle,
        enableHotLeadAlerts: updatedConfig.enableHotLeadAlerts,
        updatedAt: updatedConfig.updatedAt,
        status: updatedConfig.status
      }
    });

  } catch (error) {
    console.error('❌ Facebook Configuration Update Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration'
    }, { status: 500 });
  }
}

// DELETE endpoint to remove configuration
export async function DELETE(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    const existed = facebookConfigs.delete(customer.id);
    
    if (!existed) {
      return NextResponse.json({
        success: false,
        error: 'No configuration found to delete'
      }, { status: 404 });
    }

    console.log('🗑️ Facebook configuration deleted for customer:', customer.id);

    return NextResponse.json({
      success: true,
      message: 'Facebook Messenger AI configuration deleted successfully'
    });

  } catch (error) {
    console.error('❌ Facebook Configuration Deletion Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete configuration'
    }, { status: 500 });
  }
}

// Helper function to get configuration by customer ID (for use in webhook)
export function getFacebookConfig(customerId) {
  return facebookConfigs.get(customerId);
}

// Helper function to get configuration by page ID (for webhook routing)
export function getFacebookConfigByPageId(pageId) {
  for (const [customerId, config] of facebookConfigs.entries()) {
    // In a real implementation, you'd store the page ID with the config
    // For now, return the first active config
    if (config.status === 'active') {
      return { customerId, config };
    }
  }
  return null;
}
