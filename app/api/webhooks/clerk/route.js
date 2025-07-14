import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
// import { createCustomer } from '../../../../lib/database.js'; // TEMPORARILY DISABLED

// Force dynamic rendering for webhook processing
export const dynamic = 'force-dynamic';

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
      const businessName = `${firstName} ${lastName}`.trim() || userData.username || 'My Business';

      console.log('👤 User created webhook received:', {
        clerkUserId: userData.id,
        email,
        businessName
      });

      // TEMPORARILY SKIP DATABASE OPERATIONS TO PREVENT CRASHES
      console.log('⚠️ Database operations temporarily disabled for Gmail OAuth testing');
      
      /*
      // COMMENTED OUT TO PREVENT DUPLICATE KEY ERRORS
      const customerData = {
        clerk_user_id: userData.id,
        email: email,
        business_name: businessName,
        plan: 'basic'
      };

      const customer = await createCustomer(customerData);
      console.log('✅ Customer created successfully:', customer);
      */

      return NextResponse.json({
        success: true,
        message: 'Webhook received - database operations temporarily disabled',
        user: {
          id: userData.id,
          email: email,
          business_name: businessName
        }
      });

    } catch (error) {
      console.error('❌ Error in webhook handler:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Webhook processing error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    console.log('👤 User updated, webhook received');
    return NextResponse.json({ received: true });
  }

  if (eventType === 'user.deleted') {
    console.log('👤 User deleted, webhook received');
    return NextResponse.json({ received: true });
  }

  console.log('🔔 Unhandled webhook event:', eventType);
  return NextResponse.json({ received: true });
}
