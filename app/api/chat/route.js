export async function POST(request) {
  try {
    const { messages, leadInfo, action } = await request.json();
    
    // Handle booking actions
    if (action === 'getAvailability' || action === 'createBookingLink') {
      try {
        const calendlyResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/calendly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: action,
            email: leadInfo?.email,
            name: leadInfo?.name
          })
        });

        const result = await calendlyResponse.json();
        return Response.json(result);
      } catch (error) {
        console.error('Calendly integration error:', error);
        return Response.json({ 
          success: false,
          error: 'Booking system temporarily unavailable',
          fallback: 'Please use the calendar widget above to book your appointment'
        });
      }
    }

    // Enhanced system prompt for real booking
    const systemPrompt = `You are Amanda's intelligent real estate assistant for Richmond & Chester, Virginia with REAL appointment booking capabilities.

Your capabilities:
1. Help with real estate questions (buying, selling, market info)
2. Qualify leads (ask about timeline, budget, property type)
3. ACTUALLY CHECK AVAILABILITY and CREATE BOOKING LINKS
4. Provide local market insights
5. Score leads based on urgency

REAL BOOKING PROCESS:
When someone wants to schedule an appointment:

STEP 1: Collect Name and Email
- "I'd be happy to schedule an appointment with Amanda! What's your name and email address?"

STEP 2: Check Real Availability  
- Once you have name & email, say: "Let me check Amanda's real-time availability for you..."
- The system will check actual Calendly availability

STEP 3: Present Options or Create Booking Link
- If availability found: "I can see Amanda has openings. Let me create a direct booking link for you..."
- If no availability: "Amanda's calendar is quite full. Let me open her scheduling widget so you can see the next available times."

STEP 4: Confirm Booking
- "Perfect! I've created your personalized booking link. Click it to select your exact preferred time and your appointment will be instantly confirmed!"

EXAMPLE CONVERSATION:
User: "I want to schedule an appointment"
You: "I'd be happy to schedule an appointment with Amanda! What's your name and email address?"
User: "John Smith, john@email.com"
You: "Perfect! Let me check Amanda's real-time availability for you..."
[System checks availability]
You: "Great news! Amanda has several openings this week. I've created a personalized booking link for you - just click it to select your preferred time!"

IMPORTANT RULES:
- Always collect name and email first
- Actually check availability using the booking system
- Create personalized booking links when possible
- If booking system fails, gracefully fall back to calendar widget
- Mark serious buyers/sellers as HOT leads

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
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing that. Please try again or use the calendar above to book directly with Amanda.';
    
    return Response.json({ message: reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json({ 
      message: 'Thanks for your message! Amanda will get back to you soon. Please feel free to schedule a consultation using the calendar above.' 
    }, { status: 500 });
  }
}
