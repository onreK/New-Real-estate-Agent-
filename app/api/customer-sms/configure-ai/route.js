import { NextResponse } from 'next/server';

// In-memory storage for customer SMS configurations
const customerConfigs = new Map();

export async function POST(request) {
  try {
    const { phoneNumber, config } = await request.json();

    console.log('⚙️ Configuring SMS AI:', {
      phoneNumber,
      businessName: config?.businessName,
      personality: config?.personality,
      enableHotLeadAlerts: config?.enableHotLeadAlerts,
      businessOwnerPhone: config?.businessOwnerPhone ? '***-***-****' : 'Not provided'
    });

    // Validation
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    if (!config || !config.businessName) {
      return NextResponse.json({
        success: false,
        error: 'Business name is required in config'
      }, { status: 400 });
    }

    // Validate business owner phone if hot lead alerts are enabled
    if (config.enableHotLeadAlerts && !config.businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Business owner phone is required when hot lead alerts are enabled'
      }, { status: 400 });
    }

    // Create comprehensive AI configuration
    const aiConfig = {
      phoneNumber: phoneNumber,
      customerId: config.customerId || 'demo_customer',
      businessName: config.businessName,
      personality: config.personality || 'professional',
      businessInfo: config.businessInfo || 'Professional service business focused on helping customers.',
      welcomeMessage: config.welcomeMessage || `Hi! Thanks for reaching out to ${config.businessName}. How can I help you today?`,
      model: config.model || 'gpt-4o-mini',
      creativity: config.creativity || 0.7,
      responseLength: 'short', // SMS optimized
      
      // Hot Lead Alert Settings
      enableHotLeadAlerts: config.enableHotLeadAlerts !== false, // Default to true
      businessOwnerPhone: config.businessOwnerPhone || null,
      alertBusinessHours: config.alertBusinessHours !== false, // Default to true
      hotLeadThreshold: config.hotLeadThreshold || 7, // Score threshold for alerts
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Status tracking
      status: 'active',
      isConfigured: true
    };

    // Store configuration
    customerConfigs.set(phoneNumber, aiConfig);

    console.log('✅ SMS AI configuration saved:', {
      phoneNumber,
      businessName: aiConfig.businessName,
      personality: aiConfig.personality,
      hotLeadAlertsEnabled: aiConfig.enableHotLeadAlerts,
      businessHoursOnly: aiConfig.alertBusinessHours
    });

    // Return success response with configuration summary
    return NextResponse.json({
      success: true,
      message: 'SMS AI configured successfully',
      config: {
        phoneNumber: aiConfig.phoneNumber,
        businessName: aiConfig.businessName,
        personality: aiConfig.personality,
        model: aiConfig.model,
        enableHotLeadAlerts: aiConfig.enableHotLeadAlerts,
        alertBusinessHours: aiConfig.alertBusinessHours,
        isConfigured: aiConfig.isConfigured,
        status: aiConfig.status
      },
      features: {
        smsAI: true,
        hotLeadDetection: aiConfig.enableHotLeadAlerts,
        businessOwnerAlerts: !!aiConfig.businessOwnerPhone,
        businessHoursRespect: aiConfig.alertBusinessHours
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SMS AI configuration error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to configure SMS AI',
      details: 'Please check your configuration data and try again'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const action = searchParams.get('action');

    if (action === 'list') {
      // Return all configurations (for admin/dashboard view)
      const allConfigs = Array.from(customerConfigs.values()).map(config => ({
        phoneNumber: config.phoneNumber,
        businessName: config.businessName,
        personality: config.personality,
        enableHotLeadAlerts: config.enableHotLeadAlerts,
        status: config.status,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));

      return NextResponse.json({
        success: true,
        configurations: allConfigs,
        totalConfigs: allConfigs.length,
        activeConfigs: allConfigs.filter(c => c.status === 'active').length
      });
    }

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number parameter is required'
      }, { status: 400 });
    }

    // Get specific configuration
    const config = customerConfigs.get(phoneNumber);

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found for this phone number',
        phoneNumber: phoneNumber
      }, { status: 404 });
    }

    // Return configuration without sensitive data
    const safeConfig = {
      phoneNumber: config.phoneNumber,
      businessName: config.businessName,
      personality: config.personality,
      businessInfo: config.businessInfo,
      welcomeMessage: config.welcomeMessage,
      model: config.model,
      creativity: config.creativity,
      enableHotLeadAlerts: config.enableHotLeadAlerts,
      businessOwnerPhone: config.businessOwnerPhone ? 
        config.businessOwnerPhone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2') : null,
      alertBusinessHours: config.alertBusinessHours,
      hotLeadThreshold: config.hotLeadThreshold,
      status: config.status,
      isConfigured: config.isConfigured,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };

    return NextResponse.json({
      success: true,
      config: safeConfig,
      features: {
        smsAI: true,
        hotLeadDetection: config.enableHotLeadAlerts,
        businessOwnerAlerts: !!config.businessOwnerPhone,
        businessHoursRespect: config.alertBusinessHours
      }
    });

  } catch (error) {
    console.error('❌ SMS AI configuration retrieval error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to retrieve SMS AI configuration'
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { phoneNumber, updates } = await request.json();

    console.log('🔄 Updating SMS AI configuration:', {
      phoneNumber,
      updates: Object.keys(updates || {})
    });

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    // Get existing configuration
    const existingConfig = customerConfigs.get(phoneNumber);
    
    if (!existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found for this phone number'
      }, { status: 404 });
    }

    // Validate hot lead alert settings if being updated
    if (updates.enableHotLeadAlerts && !updates.businessOwnerPhone && !existingConfig.businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Business owner phone is required when enabling hot lead alerts'
      }, { status: 400 });
    }

    // Merge updates with existing configuration
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Store updated configuration
    customerConfigs.set(phoneNumber, updatedConfig);

    console.log('✅ SMS AI configuration updated:', {
      phoneNumber,
      businessName: updatedConfig.businessName,
      hotLeadAlertsEnabled: updatedConfig.enableHotLeadAlerts
    });

    return NextResponse.json({
      success: true,
      message: 'SMS AI configuration updated successfully',
      config: {
        phoneNumber: updatedConfig.phoneNumber,
        businessName: updatedConfig.businessName,
        personality: updatedConfig.personality,
        enableHotLeadAlerts: updatedConfig.enableHotLeadAlerts,
        alertBusinessHours: updatedConfig.alertBusinessHours,
        updatedAt: updatedConfig.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ SMS AI configuration update error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update SMS AI configuration'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number parameter is required'
      }, { status: 400 });
    }

    // Check if configuration exists
    const config = customerConfigs.get(phoneNumber);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found for this phone number'
      }, { status: 404 });
    }

    // Delete configuration
    customerConfigs.delete(phoneNumber);

    console.log('🗑️ SMS AI configuration deleted:', {
      phoneNumber,
      businessName: config.businessName
    });

    return NextResponse.json({
      success: true,
      message: 'SMS AI configuration deleted successfully',
      deletedConfig: {
        phoneNumber: config.phoneNumber,
        businessName: config.businessName
      }
    });

  } catch (error) {
    console.error('❌ SMS AI configuration deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete SMS AI configuration'
    }, { status: 500 });
  }
}
