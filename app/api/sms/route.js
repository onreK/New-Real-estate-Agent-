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
    let agentPhone = process.env.AGENT_PHONE_NUMBER; // Agent's phone number

    // Different SMS types
    switch (type) {
      case 'new_lead':
        smsMessage = `🔥 NEW ${leadData.leadScore} LEAD!\n\nName: ${leadData.name || 'Unknown'}\nEmail: ${leadData.email || 'Not provided'}\nPhone: ${leadData.phone || 'Not provided'}\nMessage: "${message}"\n\nReply ASAP! - Amanda's AI`;
        break;

      case 'appointment_booked':
        smsMessage = `📅 NEW APPOINTMENT BOOKED!\n\nName: ${leadData.name}\nEmail: ${leadData.email}\nTime: ${leadData.appointmentTime || 'Check calendar'}\n\nGet ready! - Amanda's AI`;
        break;

      case 'hot_lead_alert':
        smsMessage = `🚨 URGENT HOT LEAD!\n\n${leadData.name} is ready to ${leadData.intent || 'buy/sell'}!\nPhone: ${leadData.phone}\nEmail: ${leadData.email}\n\nCALL NOW! - Amanda's AI`;
        break;

      case 'follow_up_needed':
        smsMessage = `⏰ FOLLOW-UP REMINDER\n\nLead: ${leadData.name}\nScore: ${leadData.leadScore}\nLast contact: ${leadData.lastContact}\n\nTime to reach out! - Amanda's AI`;
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
      message: 'SMS notification sent to agent'
    });

  } catch (error) {
    console.error('SMS sending failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
