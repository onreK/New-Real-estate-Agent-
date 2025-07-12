// app/api/instagram/configure/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId,
  createCustomer
} from '../../../../lib/database.js';

// In-memory storage for customer configurations (use database in production)
let instagramConfigs = new Map();

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create customer from database
    let customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      console.log('👤 Creating customer record for Instagram user:', user.id);
      
      const customerData = {
        clerk_user_id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || '',
        business_name: user.firstName && user.lastName ? 
          `${user.firstName} ${user.lastName}` : 'My Business',
        plan: 'basic'
      };
      
      customer = await createCustomer(customerData);
      console.log('✅ Created new customer for Instagram user:', customer.id);
    }

    const { config } = await request.json();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration is required'
      }, { status: 400 });
    }

    // Validate required fields
    const requiredFields = ['businessName', 'instagramAccessToken', 'verifyToken'];
    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === '') {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }

    console.log('⚙️ Configuring Instagram AI for customer:', customer.id);

    // Create configuration object
    const instagramConfig = {
      customerId: customer.id,
      clerkUserId: user.id,
      businessName: config.businessName.trim(),
      industry: config.industry || 'General Business',
      personality: config.personality || 'friendly',
      welcomeMessage: config.welcomeMessage || `Hi! Thanks for reaching out on Instagram! 📸 How can I help you today?`,
      responseStyle: config.responseStyle || 'casual',
      enableHotLeadAlerts: config.enableHotLeadAlerts !== false,
      
      // Instagram credentials (in production, encrypt these)
      instagramAccessToken: config.instagramAccessToken.trim(),
      verifyToken: config.verifyToken.trim(),
      instagramBusinessAccountId: config.instagramBusinessAccountId || '',
      
      // Metadata
      configuredAt: new Date().toISOString(),
      status: 'active',
      platform: 'instagram'
    };

    // Store configuration using customer ID as key
    instagramConfigs.set(customer.id, instagramConfig);

    console.log('✅ Instagram AI configured successfully:', {
      customerId: customer.id,
      businessName: instagramConfig.businessName,
      personality: instagramConfig.personality,
      hotLeadAlerts: instagramConfig.enableHotLeadAlerts
    });

    // Return success response (don't include sensitive tokens)
    return NextResponse.json({
      success: true,
      config: {
        businessName: instagramConfig.businessName,
        industry: instagramConfig.industry,
        personality: instagramConfig.personality,
        welcomeMessage: instagramConfig.welcomeMessage,
        responseStyle: instagramConfig.responseStyle,
        enableHotLeadAlerts: instagramConfig.enableHotLeadAlerts,
        configuredAt: instagramConfig.configuredAt,
        status: instagramConfig.status
      }
    });

  } catch (error) {
    console.error('❌ Instagram Configuration Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to configure Instagram AI'
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

    const config = instagramConfigs.get(customer.id);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'No Instagram configuration found'
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
        hasInstagramAccessToken: !!config.instagramAccessToken,
        hasVerifyToken: !!config.verifyToken
      }
    });

  } catch (error) {
    console.error('❌ Instagram Configuration Retrieval Error:', error);
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

    const existingConfig = instagramConfigs.get(customer.id);
    
    if (!existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'No existing configuration found. Please complete initial setup first.'
      }, { status: 404 });
    }

    console.log('🔄 Updating Instagram configuration for customer:', customer.id);

    // Update configuration
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    instagramConfigs.set(customer.id, updatedConfig);

    console.log('✅ Instagram configuration updated successfully');

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
    console.error('❌ Instagram Configuration Update Error:', error);
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

    const existed = instagramConfigs.delete(customer.id);
    
    if (!existed) {
      return NextResponse.json({
        success: false,
        error: 'No configuration found to delete'
      }, { status: 404 });
    }

    console.log('🗑️ Instagram configuration deleted for customer:', customer.id);

    return NextResponse.json({
      success: true,
      message: 'Instagram AI configuration deleted successfully'
    });

  } catch (error) {
    console.error('❌ Instagram Configuration Deletion Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete configuration'
    }, { status: 500 });
  }
}
