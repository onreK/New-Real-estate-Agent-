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
    return new Response('Error occurred -- no svix headers', {
      status: 400
    });
  }

  // Get the body as text (required for webhook verification)
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Get the Webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET not found in environment variables');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error('❌ Webhook verification failed:', err);
    return new Response('Error occurred', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  const userData = evt.data;
  
  console.log(`🔔 Clerk webhook received: ${eventType} for user ${userData.id}`);

  if (eventType === 'user.created') {
    try {
      // Extract user information
      const email = userData.email_addresses?.[0]?.email_address || '';
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';
      const phone = userData.phone_numbers?.[0]?.phone_number || '';
      const name = `${firstName} ${lastName}`.trim() || userData.username || 'New Customer';

      console.log('👤 Creating customer for new user:', {
        clerkUserId: userData.id,
        email,
        name
      });

      // Create customer in database
      const customerData = {
        id: Date.now(), // Simple ID for now
        name: name,
        email: email,
        phone: phone,
        clerk_user_id: userData.id, // Store Clerk user ID for linking
        created_at: new Date().toISOString(),
        subscription_tier: 'basic',
        subscription_status: 'trial'
      };

      const customer = await createCustomer(customerData);

      console.log('✅ Customer created successfully:', customer);

      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name
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
