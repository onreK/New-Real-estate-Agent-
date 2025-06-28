import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { headers } from 'next/headers';

export async function POST(request) {
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` }, 
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' }, 
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session) {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const userId = session.metadata.userId;
    const subscriptionId = session.subscription;

    if (!userId) {
      console.error('No userId in session metadata');
      return;
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;

    // Determine plan based on price ID
    let plan = 'starter';
    if (priceId.includes('professional')) plan = 'professional';
    if (priceId.includes('enterprise')) plan = 'enterprise';

    // Update user metadata in Clerk
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscriptionId,
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        planStartDate: new Date().toISOString(),
      }
    });

    console.log(`Subscription activated for user ${userId}: ${plan}`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    
    // Find user by Stripe subscription ID
    const users = await clerkClient.users.getUserList();
    const user = users.find(u => 
      u.publicMetadata?.stripeSubscriptionId === subscription.id
    );

    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: subscription.status,
        }
      });
      console.log(`Subscription updated for user ${user.id}: ${subscription.status}`);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    
    // Find user by Stripe subscription ID
    const users = await clerkClient.users.getUserList();
    const user = users.find(u => 
      u.publicMetadata?.stripeSubscriptionId === subscription.id
    );

    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'canceled',
          subscriptionPlan: null,
          canceledAt: new Date().toISOString(),
        }
      });
      console.log(`Subscription canceled for user ${user.id}`);
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    
    // Find user by Stripe customer ID
    const users = await clerkClient.users.getUserList();
    const user = users.find(u => 
      u.publicMetadata?.stripeCustomerId === invoice.customer
    );

    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'past_due',
          lastPaymentFailed: new Date().toISOString(),
        }
      });
      console.log(`Payment failed for user ${user.id}`);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}
