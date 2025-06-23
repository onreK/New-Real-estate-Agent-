export async function POST(request) {
  try {
    const { messages, leadInfo } = await request.json();
    
    // System prompt that can handle appointments and lead qualification
    const systemPrompt = `You are Amanda's intelligent real estate assistant for Richmond & Chester, Virginia. 

Your capabilities:
1. Help with real estate questions (buying, selling, market info)
2. Qualify leads (ask about timeline, budget, property type)
3. Schedule appointments when requested
4. Provide local market insights
5. Always encourage booking a consultation

When someone wants to schedule an appointment:
- Ask for their preferred time/date
- Confirm their contact information
- Let them know Amanda will call to confirm
- Encourage using the calendar widget for instant booking

Keep responses friendly, professional, and focused on helping them achieve their real estate goals. Always end with encouraging them to book a consultation if they seem interested.

Current lead info: ${JSON.stringify(leadInfo || {})}`;

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
    const reply = data.choices[0]?.message?.content || 'I apologize, but I had trouble processing that. Please try again or use the calendar above to book directly with Amanda.';
    
    return Response.json({ message: reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json({ 
      message: 'Thanks for your message! Amanda will get back to you soon. Please feel free to schedule a consultation using the calendar above.' 
    }, { status: 500 });
  }
}
