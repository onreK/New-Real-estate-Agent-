export async function POST(request) {
  try {
    const { messages, leadInfo, action, bookingData } = await request.json();
    
    // Handle appointment booking requests
    if (action === 'bookAppointment') {
      try {
        const bookingResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/calendly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'bookAppointment',
            ...bookingData
          })
        });

        const result = await bookingResponse.json();
        return Response.json(result);
      } catch (error) {
        return Response.json({ 
          error: 'Failed to book appointment',
          message: 'I apologize, but I had trouble booking that appointment. Please try using the calendar widget above or call Amanda directly.'
        }, { status: 500 });
      }
    }

    // Enhanced system prompt with real booking capabilities
    const systemPrompt = `You are Amanda's intelligent real estate assistant for Richmond & Chester, Virginia. 

Your capabilities:
1. Help with real estate questions (buying, selling, market info)
2. Qualify leads (ask about timeline, budget, property type)
3. ACTUALLY BOOK APPOINTMENTS when requested
4. Provide local market insights
5. Always encourage booking a consultation

IMPORTANT BOOKING INSTRUCTIONS:
When someone wants to schedule an appointment:
1. Ask for their name and email
2. Suggest available times (weekdays 9am-5pm, suggest 2-3 options)
3. Once they agree to a time, confirm you're booking it
4. If booking is successful, confirm the details
5. If booking fails, direct them to the calendar widget

Example booking conversation:
User: "I'd like to schedule an appointment"
You: "I'd be happy to book an appointment for you! What's your name and email address?"
User: "John Smith, john@email.com"
You: "Great! I have availability tomorrow at 2pm, Thursday at 10am, or Friday at 3pm. Which works best for you?"
User: "Thursday at 10am"
You: "Perfect! Let me book Thursday at 10am for you right now..."

Current lead info: ${JSON.stringify(leadInfo || {})}

Keep responses friendly, professional, and focused on helping them achieve their real estate goals.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.from === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing that. Please try again or use the calendar above to book directly with Amanda.';
    
    // Check if the AI is trying to book an appointment
    const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || '';
    const aiResponse = reply.toLowerCase();
    
    const isBookingIntent = (
      aiResponse.includes('book') || 
      aiResponse.includes('schedule') ||
      aiResponse.includes('appointment') ||
      lastMessage.includes('book') ||
      lastMessage.includes('schedule')
    ) && (
      aiResponse.includes('let me') ||
      aiResponse.includes("i'll book") ||
      aiResponse.includes('booking')
    );

    // If AI wants to book and we have name/email in lead info
    if (isBookingIntent && leadInfo && leadInfo.email && leadInfo.name) {
      // Extract time preference from conversation
      const conversation = messages.map(m => m.text).join(' ');
      const timeMatch = conversation.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}(am|pm)|\d{1,2}:\d{2})/gi);
      
      if (timeMatch) {
        // Try to book the appointment
        try {
          const bookingResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/calendly`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'bookAppointment',
              name: leadInfo.name,
              email: leadInfo.email,
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
              time: '10:00' // Default time
            })
          });

          if (bookingResponse.ok) {
            const bookingResult = await bookingResponse.json();
            reply = `Perfect! I've successfully booked your appointment for tomorrow at 10:00 AM. You'll receive a confirmation email at ${leadInfo.email} shortly. Amanda is looking forward to meeting with you!`;
          }
        } catch (error) {
          console.error('Booking failed:', error);
          reply += " However, I had trouble with the booking system. Please use the calendar widget above to secure your appointment.";
        }
      }
    }
    
    return Response.json({ message: reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json({ 
      message: 'Thanks for your message! Amanda will get back to you soon. Please feel free to schedule a consultation using the calendar above.' 
    }, { status: 500 });
  }
}
