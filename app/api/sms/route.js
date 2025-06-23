import { Twilio } from 'twilio';

export async function POST(request) {
  try {
    const { type, leadData, message } = await request.json();
    
    // Initialize Twilio
    const client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    let smsMessage = '';
    
    // Support multiple agent phone numbers (fallback system)
    let agentPhone = process.env.AGENT_PHONE_NUMBER || process.env.AGENT_PHONE_BACKUP;
    
    // If still no phone number, log error
    if (!agentPhone) {
      console.error('No agent phone number configured');
      return Response.json({
        success: false,
        error: 'Agent phone number not configured'
      }, { status: 400 });
    }

    // Different SMS types with better formatting
    switch (type) {
      case 'new_lead':
        smsMessage = `🔥 NEW ${leadData.leadScore} LEAD!

👤 Name: ${leadData.name || 'Unknown'}
📧 Email: ${leadData.email || 'Not provided'}
📱 Phone: ${leadData.phone || 'Not provided'}
💬 Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

⚡ Reply ASAP! - Amanda's AI`;
        break;

      case 'appointment_booked':
        smsMessage = `📅 NEW APPOINTMENT BOOKED!

👤 Name: ${leadData.name}
📧 Email: ${leadData.email}
📅 Time: ${leadData.appointmentTime || 'Check Calendly'}

🎉 Get ready! - Amanda's AI`;
        break;

      case 'hot_lead_alert':
        smsMessage = `🚨 URGENT HOT LEAD!

${leadData.name} is ready to ${leadData.intent || 'buy/sell'}!
📱 Phone: ${leadData.phone}
📧 Email: ${leadData.email}

🔥 CALL NOW! - Amanda's AI`;
        break;

      case 'follow_up_needed':
        smsMessage = `⏰ FOLLOW-UP REMINDER

👤 Lead: ${leadData.name}
📊 Score: ${leadData.leadScore}
📅 Last contact: ${leadData.lastContact}

💼 Time to reach out! - Amanda's AI`;
        break;

      default:
        smsMessage = `📱 Lead Update: ${message}`;
    }

    // Send SMS to agent
    const result = await client.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
      to: agentPhone
    });

    console.log('SMS sent successfully:', result.sid);

    return Response.json({
      success: true,
      messageSid: result.sid,
      message: 'SMS notification sent to agent',
      sentTo: agentPhone
    });

  } catch (error) {
    console.error('SMS sending failed:', error);
    
    // Better error handling
    if (error.code === 21211) {
      return Response.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
