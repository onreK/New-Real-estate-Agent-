import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory storage for alert throttling and history
const alertHistory = new Map();
const throttleMap = new Map();

export async function POST(request) {
  try {
    const {
      businessOwnerPhone,
      leadInfo,
      messageContent,
      customerConfig = {},
      source = 'web'
    } = await request.json();

    console.log('📢 Hot lead alert request:', {
      businessOwnerPhone,
      leadScore: leadInfo?.score,
      source,
      enableAlerts: customerConfig.enableHotLeadAlerts
    });

    // Validation
    if (!businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Business owner phone number is required'
      }, { status: 400 });
    }

    if (!leadInfo || !leadInfo.score) {
      return NextResponse.json({
        success: false,
        error: 'Lead info with score is required'
      }, { status: 400 });
    }

    if (!twilioClient) {
      return NextResponse.json({
        success: false,
        error: 'Twilio not configured'
      }, { status: 500 });
    }

    // Check if alerts are enabled
    if (customerConfig.enableHotLeadAlerts === false) {
      console.log('🚫 Hot lead alerts disabled for this customer');
      return NextResponse.json({
        success: false,
        reason: 'Hot lead alerts disabled',
        alertSent: false
      });
    }

    // Check business hours if enabled
    if (customerConfig.alertBusinessHours) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Skip weekends and outside business hours (8 AM - 6 PM)
      if (day === 0 || day === 6 || hour < 8 || hour > 18) {
        console.log('🕐 Outside business hours, skipping alert');
        return NextResponse.json({
          success: false,
          reason: 'Outside business hours',
          alertSent: false
        });
      }
    }

    // Check alert throttling - max 1 alert per lead per 30 minutes
    const throttleKey = `${businessOwnerPhone}_${leadInfo.phone || 'web_visitor'}`;
    const lastAlert = throttleMap.get(throttleKey);
    const now = Date.now();
    
    if (lastAlert && (now - lastAlert) < 30 * 60 * 1000) {
      console.log('⏳ Alert throttled - too recent');
      return NextResponse.json({
        success: false,
        reason: 'Alert throttled - too recent',
        alertSent: false,
        nextAlertAllowed: new Date(lastAlert + 30 * 60 * 1000).toISOString()
      });
    }

    // Create alert message
    const urgencyEmoji = leadInfo.score >= 9 ? '🚨' : leadInfo.score >= 7 ? '🔥' : '⚡';
    const sourceLabel = source === 'sms' ? 'SMS' : 'Website';
    const businessName = customerConfig.businessName || 'Your Business';
    
    let alertMessage = `${urgencyEmoji} HOT LEAD ALERT!\n\n`;
    alertMessage += `Score: ${leadInfo.score}/10\n`;
    alertMessage += `Source: ${sourceLabel}\n`;
    
    if (leadInfo.phone) {
      alertMessage += `Phone: ${leadInfo.phone}\n`;
    }
    
    alertMessage += `Message: "${messageContent.slice(0, 100)}${messageContent.length > 100 ? '...' : ''}"\n\n`;
    alertMessage += `Reason: ${leadInfo.reasoning}\n`;
    
    if (leadInfo.nextAction) {
      alertMessage += `Next: ${leadInfo.nextAction}\n`;
    }
    
    alertMessage += `\n${businessName} AI Assistant`;

    // Send SMS alert
    const message = await twilioClient.messages.create({
      body: alertMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: businessOwnerPhone
    });

    // Update throttle timestamp
    throttleMap.set(throttleKey, now);

    // Store alert history
    const alertRecord = {
      id: message.sid,
      timestamp: new Date().toISOString(),
      businessOwnerPhone,
      leadInfo,
      messageContent: messageContent.slice(0, 200),
      source,
      customerConfig: {
        businessName: customerConfig.businessName,
        alertBusinessHours: customerConfig.alertBusinessHours
      },
      alertSent: true,
      twilioSid: message.sid
    };

    const historyKey = `${businessOwnerPhone}_alerts`;
    const history = alertHistory.get(historyKey) || [];
    history.unshift(alertRecord); // Add to beginning
    
    // Keep only last 50 alerts
    if (history.length > 50) {
      history.splice(50);
    }
    
    alertHistory.set(historyKey, history);

    console.log('✅ Hot lead alert sent successfully:', {
      sid: message.sid,
      to: businessOwnerPhone,
      score: leadInfo.score
    });

    return NextResponse.json({
      success: true,
      alertSent: true,
      messageId: message.sid,
      leadScore: leadInfo.score,
      alertMessage: alertMessage.slice(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Business owner alert error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      alertSent: false
    }, { status: 500 });
  }
}

// GET endpoint for retrieving alert history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessOwnerPhone = searchParams.get('phone');

    if (!businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Business owner phone parameter is required'
      }, { status: 400 });
    }

    const historyKey = `${businessOwnerPhone}_alerts`;
    const history = alertHistory.get(historyKey) || [];

    // Calculate statistics
    const stats = {
      totalAlerts: history.length,
      alertsLast24h: history.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        const now = new Date();
        return (now - alertTime) < 24 * 60 * 60 * 1000;
      }).length,
      alertsLast7days: history.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        const now = new Date();
        return (now - alertTime) < 7 * 24 * 60 * 60 * 1000;
      }).length,
      averageLeadScore: history.length > 0 
        ? (history.reduce((sum, alert) => sum + (alert.leadInfo?.score || 0), 0) / history.length).toFixed(1)
        : 0,
      highestScore: history.length > 0 
        ? Math.max(...history.map(alert => alert.leadInfo?.score || 0))
        : 0
    };

    return NextResponse.json({
      success: true,
      alerts: history.slice(0, 20), // Return last 20 alerts
      stats,
      throttleInfo: {
        message: 'Alerts are throttled to max 1 per lead per 30 minutes',
        businessHoursOnly: 'Configurable per customer'
      }
    });

  } catch (error) {
    console.error('❌ Alert history retrieval error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      alerts: [],
      stats: {}
    }, { status: 500 });
  }
}

// DELETE endpoint for clearing alert history (admin function)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessOwnerPhone = searchParams.get('phone');

    if (!businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Business owner phone parameter is required'
      }, { status: 400 });
    }

    const historyKey = `${businessOwnerPhone}_alerts`;
    const deletedCount = alertHistory.get(historyKey)?.length || 0;
    
    alertHistory.delete(historyKey);
    
    // Also clear throttle entries for this phone
    const throttleKeys = Array.from(throttleMap.keys()).filter(key => key.startsWith(businessOwnerPhone));
    throttleKeys.forEach(key => throttleMap.delete(key));

    console.log(`🗑️ Cleared ${deletedCount} alerts for ${businessOwnerPhone}`);

    return NextResponse.json({
      success: true,
      deletedAlerts: deletedCount,
      message: `Cleared ${deletedCount} alerts and throttle entries`
    });

  } catch (error) {
    console.error('❌ Alert history deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
