export async function POST(request) {
  try {
    const { action, email, name } = await request.json();
    
    const headers = {
      'Authorization': `Bearer ${process.env.CALENDLY_TOKEN}`,
      'Content-Type': 'application/json'
    };

    if (action === 'getAvailability') {
      try {
        // Get user info
        const userResponse = await fetch('https://api.calendly.com/users/me', { headers });
        if (!userResponse.ok) {
          throw new Error(`User API failed: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        const userUri = userData.resource.uri;
        
        // Get event types
        const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, { headers });
        if (!eventTypesResponse.ok) {
          throw new Error(`Event types API failed: ${eventTypesResponse.status}`);
        }
        const eventTypesData = await eventTypesResponse.json();
        
        // Find consultation event
        const consultationEvent = eventTypesData.collection.find(event => 
          event.name.toLowerCase().includes('consultation') || 
          event.slug.includes('home-buyer-consultation') ||
          event.name.toLowerCase().includes('buyer')
        );
        
        if (!consultationEvent) {
          return Response.json({ 
            success: false, 
            error: 'Consultation event type not found',
            availableEvents: eventTypesData.collection.map(e => e.name)
          });
        }

        // Get next 7 days availability
        const startTime = new Date().toISOString();
        const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const availabilityUrl = `https://api.calendly.com/event_type_available_times?event_type=${consultationEvent.uri}&start_time=${startTime}&end_time=${endTime}`;
        const availabilityResponse = await fetch(availabilityUrl, { headers });
        
        if (!availabilityResponse.ok) {
          throw new Error(`Availability API failed: ${availabilityResponse.status}`);
        }
        
        const availabilityData = await availabilityResponse.json();
        
        return Response.json({
          success: true,
          eventTypeUri: consultationEvent.uri,
          availableTimes: availabilityData.collection || [],
          eventName: consultationEvent.name
        });
        
      } catch (error) {
        console.error('Availability error:', error);
        return Response.json({ 
          success: false, 
          error: error.message,
          action: 'getAvailability'
        });
      }
    }

    if (action === 'createBookingLink') {
      try {
        // Get user and event type (same as above)
        const userResponse = await fetch('https://api.calendly.com/users/me', { headers });
        if (!userResponse.ok) {
          throw new Error(`User API failed: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        const userUri = userData.resource.uri;
        
        const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, { headers });
        if (!eventTypesResponse.ok) {
          throw new Error(`Event types API failed: ${eventTypesResponse.status}`);
        }
        const eventTypesData = await eventTypesResponse.json();
        
        const consultationEvent = eventTypesData.collection.find(event => 
          event.name.toLowerCase().includes('consultation') || 
          event.slug.includes('home-buyer-consultation') ||
          event.name.toLowerCase().includes('buyer')
        );
        
        if (!consultationEvent) {
          return Response.json({ 
            success: false, 
            error: 'Event type not found' 
          });
        }

        // Create a custom booking link with pre-filled info
        const bookingUrl = `${consultationEvent.scheduling_url}?prefill_email=${encodeURIComponent(email)}&prefill_name=${encodeURIComponent(name)}`;
        
        return Response.json({
          success: true,
          bookingUrl: bookingUrl,
          eventName: consultationEvent.name,
          message: `Booking link created for ${name}`
        });
        
      } catch (error) {
        console.error('Booking link error:', error);
        return Response.json({ 
          success: false, 
          error: error.message,
          action: 'createBookingLink'
        });
      }
    }

    return Response.json({ 
      success: false, 
      error: 'Invalid action. Use "getAvailability" or "createBookingLink"' 
    });

  } catch (error) {
    console.error('Calendly API error:', error);
    return Response.json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
