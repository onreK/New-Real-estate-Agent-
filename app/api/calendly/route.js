export async function POST(request) {
  try {
    const { action, email, name, date, time } = await request.json();
    
    const headers = {
      'Authorization': `Bearer ${process.env.CALENDLY_TOKEN}`,
      'Content-Type': 'application/json'
    };

    if (action === 'getAvailability') {
      // Get user info first
      const userResponse = await fetch('https://api.calendly.com/users/me', { headers });
      const userData = await userResponse.json();
      const userUri = userData.resource.uri;
      
      // Get event types
      const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, { headers });
      const eventTypesData = await eventTypesResponse.json();
      
      // Find the consultation event type
      const consultationEvent = eventTypesData.collection.find(event => 
        event.name.toLowerCase().includes('consultation') || 
        event.slug.includes('home-buyer-consultation')
      );
      
      if (!consultationEvent) {
        return Response.json({ error: 'Consultation event type not found' }, { status: 404 });
      }

      // Get availability for the next 7 days
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const availabilityResponse = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${consultationEvent.uri}&start_time=${startTime}&end_time=${endTime}`, 
        { headers }
      );
      
      const availabilityData = await availabilityResponse.json();
      
      return Response.json({
        success: true,
        eventTypeUri: consultationEvent.uri,
        availableTimes: availabilityData.collection || []
      });
    }

    if (action === 'bookAppointment') {
      // Get event type URI first (same as above)
      const userResponse = await fetch('https://api.calendly.com/users/me', { headers });
      const userData = await userResponse.json();
      const userUri = userData.resource.uri;
      
      const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, { headers });
      const eventTypesData = await eventTypesResponse.json();
      
      const consultationEvent = eventTypesData.collection.find(event => 
        event.name.toLowerCase().includes('consultation') || 
        event.slug.includes('home-buyer-consultation')
      );
      
      if (!consultationEvent) {
        return Response.json({ error: 'Consultation event type not found' }, { status: 404 });
      }

      // Create the appointment
      const bookingData = {
        event_type: consultationEvent.uri,
        start_time: new Date(`${date} ${time}`).toISOString(),
        invitee: {
          email: email,
          name: name
        }
      };

      const bookingResponse = await fetch('https://api.calendly.com/scheduled_events', {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData)
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        return Response.json({ 
          error: 'Failed to book appointment', 
          details: errorData 
        }, { status: 400 });
      }

      const bookingResult = await bookingResponse.json();
      
      return Response.json({
        success: true,
        appointment: bookingResult.resource,
        message: `Appointment booked successfully for ${name} on ${date} at ${time}`
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Calendly API error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
