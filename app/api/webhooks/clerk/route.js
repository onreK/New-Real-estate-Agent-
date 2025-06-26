import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { createCustomer } from '../../../../lib/database.js';

export async function POST(req) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || 'temp_secret');

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    
    // For development, we'll be more lenient
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Webhook verification failed in development, proceeding anyway...');
      evt = payload;
    } else {
      return new Response('Error occured', {
        status: 400
      });
    }
  }

  // Handle the webhook
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`🔔 Clerk webhook received: ${eventType} for user ${id}`);

  if (eventType === 'user.created') {
    try {
      const userData = evt.data;
      
      // Extract user information
      const email = userData.email_addresses?.[0]?.email_address;
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';
      const businessName = `${firstName} ${lastName}`.trim() || 'My Business';

      console.log('👤 Creating customer for new user:', {
        clerkUserId: id,
        email,
        businessName
      });

      // Create customer in database
      const customer = await createCustomer({
        clerk_user_id: id,
        email: email,
        business_name: businessName,
        plan: 'basic'
      });

      console.log('✅ Customer created successfully:', customer);

      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        customer: {
          id: customer.id,
          email: customer.email,
          business_name: customer.business_name
        }
      });

    } catch (error) {
      console.error('❌ Error creating customer:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create customer',
        details: error.message
      }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    console.log('👤 User updated, webhook received');
    // Handle user updates if needed
    return NextResponse.json({ received: true });
  }

  if (eventType === 'user.deleted') {
    console.log('👤 User deleted, webhook received');
    // Handle user deletion if needed
    return NextResponse.json({ received: true });
  }

  console.log('🔔 Unhandled webhook event:', eventType);
  return NextResponse.json({ received: true });
}
