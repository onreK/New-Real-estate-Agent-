import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// In-memory alert tracking (use database in production)
let alertHistory = new Map();
let alertSettings = new Map();

function isWithinBusinessHours(alertConfig) {
  if (!alertConfig.respectBusinessHours) return true;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday
  
  // Check if current day is in allowed days
  if (!alertConfig.allowedDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current hour is in allowed range
  return currentHour >= alertConfig.startHour && currentHour <= alertConfig.endHour;
}

function shouldThrottleAlert(leadPhone, businessOwnerPhone) {
  const throttleKey = `${leadPhone}-${businessOwnerPhone}`;
  const lastAlert = alertHistory.get(throttleKey);
  
  if (!lastAlert) return false;
  
  const now = Date.now();
  const timeDiff = now - lastAlert.timestamp;
  const throttleMinutes = 30; // Don't send same lead alert within 30 minutes
  
  return timeDiff < (throttleMinutes * 60 * 1000);
}

function formatPhoneForDisplay(phone) {
  if (!phone || phone === 'Not provided') return 'No phone provided';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1);
    return `(${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
  }
  return phone;
}

function generateAlertMessage(leadAnalysis, customAlertTemplate) {
  const { leadInfo, leadScore, source, analysis } = leadAnalysis;
  
  // Use custom template if provided
  if (customAlertTemplate) {
    return customAlertTemplate
      .replace('{leadName}', leadInfo.name)
      .replace('{leadPhone}', formatPhoneForDisplay(leadInfo.phone))
      .replace('{lastMessage}', leadInfo.lastMessage.substring(0, 100))
      .replace('{score}', leadScore)
      .replace('{source}', source);
  }
  
  // Default templates based on score and source
  const urgencyEmoji = leadScore >= 9 ? '🔥🔥🔥' : leadScore >= 8 ? '🔥🔥' : '🔥';
  const sourceEmoji = source === 'sms' ? '📱' : '💬';
  
  let alertMessage;
  
  if (leadScore >= 9) {
    alertMessage = `${urgencyEmoji} URGENT HOT LEAD! ${sourceEmoji}
${leadInfo.name} via ${source}
Said: "${leadInfo.lastMessage.substring(0, 80)}..."
Phone: ${formatPhoneForDisplay(leadInfo.phone)}
Score: ${leadScore}/10 🔥
Reply CALL to connect now!`;
  } else if (leadScore >= 8) {
    alertMessage = `${urgencyEmoji} HOT LEAD ALERT! ${sourceEmoji}
${leadInfo.name} from ${source}
"${leadInfo.lastMessage.substring(0, 100)}"
Contact: ${formatPhoneForDisplay(leadInfo.phone)}
Lead score: ${leadScore}/10`;
  } else {
    alertMessage = `${urgencyEmoji} Qualified Lead ${sourceEmoji}
${leadInfo.name} (${source})
Interest: ${analysis.buyingIntent}
Phone: ${formatPhoneForDisplay(leadInfo.phone)}
"${leadInfo.lastMessage.substring(0, 80)}..."`;
  }
  
  return alertMessage;
}

export async function POST(request) {
  try {
    const {
      leadAnalysis,
      businessOwnerPhone,
      customerId,
      alertConfig = {}
    } = await request.json();

    if (!leadAnalysis || !businessOwnerPhone) {
      return NextResponse.json({
        success: false,
        error: 'Lead analysis and business owner phone required'
      }, { status: 400 });
    }

    const { leadInfo, leadScore, source } = leadAnalysis;

    console.log('🚨 Processing hot lead alert:', {
      customerId,
      leadScore,
      source,
      businessOwnerPhone: businessOwnerPhone.substring(0, 8) + '...'
    });

    // Check if within business hours (if configured)
    if (!isWithinBusinessHours(alertConfig)) {
      console.log('⏰ Outside business hours - skipping alert');
      return NextResponse.json({
        success: true,
        sent: false,
        reason: 'Outside business hours'
      });
    }

    // Check throttling to prevent spam
    if (shouldThrottleAlert(leadInfo.phone, businessOwnerPhone)) {
      console.log('🛑 Alert throttled - recent alert for same lead');
      return NextResponse.json({
        success: true,
        sent: false,
        reason: 'Alert throttled - recent alert sent'
      });
    }

    // Generate alert message
    const alertMessage = generateAlertMessage(leadAnalysis, alertConfig.customTemplate);

    // Send SMS alert
    let alertSent = false;
    let twilioResponse = null;

    if (twilioClient) {
      try {
        twilioResponse = await twilioClient.messages.create({
          body: alertMessage,
          from: process.env.TWILIO_PHONE_NUMBER || process.env.AGENT_PHONE_NUMBER,
          to: businessOwnerPhone
        });
        alertSent = true;
      } catch (twilioError) {
        console.error('❌ Twilio SMS Error:', twilioError);
        // Continue with demo mode if Twilio fails
      }
    }

    // Record alert in history
    const alertRecord = {
      id: `alert_${Date.now()}`,
      customerId: customerId,
      leadPhone: leadInfo.phone,
      leadName: leadInfo.name,
      businessOwnerPhone: businessOwnerPhone,
      leadScore: leadScore,
      source: source,
      message: alertMessage,
      sent: alertSent,
      timestamp: Date.now(),
      twilioSid: twilioResponse?.sid || null
    };

    // Store alert
    const throttleKey = `${leadInfo.phone}-${businessOwnerPhone}`;
    alertHistory.set(throttleKey, alertRecord);

    console.log('✅ Hot lead alert processed:', {
      sent: alertSent,
      leadScore: leadScore,
      messageSid: twilioResponse?.sid
    });

    return NextResponse.json({
      success: true,
      sent: alertSent,
      alert: {
        id: alertRecord.id,
        message: alertMessage,
        leadScore: leadScore,
        source: source,
        timestamp: alertRecord.timestamp
      },
      twilioSid: twilioResponse?.sid,
      demo: !twilioClient
    });

  } catch (error) {
    console.error('❌ Business Owner Alert Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send business owner alert'
    }, { status: 500 });
  }
}

// Get alert history for a customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit')) || 50;

    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID required'
      }, { status: 400 });
    }

    // Get alerts for this customer
    const customerAlerts = Array.from(alertHistory.values())
      .filter(alert => alert.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(alert => ({
        id: alert.id,
        leadName: alert.leadName,
        leadPhone: formatPhoneForDisplay(alert.leadPhone),
        leadScore: alert.leadScore,
        source: alert.source,
        sent: alert.sent,
        timestamp: new Date(alert.timestamp).toISOString(),
        message: alert.message.substring(0, 100) + '...'
      }));

    // Calculate stats
    const stats = {
      totalAlerts: customerAlerts.length,
      alertsSent: customerAlerts.filter(a => a.sent).length,
      avgLeadScore: customerAlerts.length > 0 
        ? Math.round(customerAlerts.reduce((sum, a) => sum + a.leadScore, 0) / customerAlerts.length)
        : 0,
      sourcesBreakdown: {
        sms: customerAlerts.filter(a => a.source === 'sms').length,
        website: customerAlerts.filter(a => a.source === 'website').length
      }
    };

    return NextResponse.json({
      success: true,
      alerts: customerAlerts,
      stats: stats,
      count: customerAlerts.length
    });

  } catch (error) {
    console.error('❌ Get Alert History Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load alert history'
    }, { status: 500 });
  }
}

// Update alert settings for a customer
export async function PUT(request) {
  try {
    const {
      customerId,
      businessOwnerPhone,
      respectBusinessHours = true,
      startHour = 8,
      endHour = 20,
      allowedDays = [1, 2, 3, 4, 5], // Monday-Friday
      customTemplate = null,
      minLeadScore = 7
    } = await request.json();

    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID required'
      }, { status: 400 });
    }

    const settings = {
      customerId,
      businessOwnerPhone,
      respectBusinessHours,
      startHour,
      endHour,
      allowedDays,
      customTemplate,
      minLeadScore,
      updatedAt: new Date().toISOString()
    };

    alertSettings.set(customerId, settings);

    console.log('⚙️ Alert settings updated:', {
      customerId,
      respectBusinessHours,
      hours: `${startHour}-${endHour}`
    });

    return NextResponse.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('❌ Update Alert Settings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update alert settings'
    }, { status: 500 });
  }
}

// Export functions for other routes to use
export function getCustomerAlertSettings(customerId) {
  return alertSettings.get(customerId) || {
    respectBusinessHours: true,
    startHour: 8,
    endHour: 20,
    allowedDays: [1, 2, 3, 4, 5],
    minLeadScore: 7
  };
}

export function getAlertHistory() {
  return Array.from(alertHistory.values());
}
