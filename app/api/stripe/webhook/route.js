import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { headers } from 'next/headers';
import { query } from '../../../../lib/database.js';

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
    if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID || priceId.includes('professional')) plan = 'professional';
    if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID || priceId.includes('business') || priceId.includes('enterprise')) plan = 'business';

    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const status = subscription.status; // 'trialing', 'active', etc.

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscriptionId,
        subscriptionPlan: plan,
        subscriptionStatus: status,
        planStartDate: new Date().toISOString(),
      }
    });

    // Write to DB so admin dashboard can track it
    await query(`
      UPDATE customers
      SET plan = $1,
          stripe_customer_id = $2,
          stripe_subscription_id = $3,
          subscription_status = $4,
          trial_ends_at = $5,
          churned_at = NULL,
          updated_at = NOW()
      WHERE clerk_user_id = $6
    `, [plan, session.customer, subscriptionId, status, trialEnd, userId]).catch(e => console.error('DB update failed in checkout:', e.message));

    console.log(`Subscription activated for user ${userId}: ${plan} (${status})`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');

    // Update DB by stripe_subscription_id (fastest, no user list scan needed)
    await query(`
      UPDATE customers
      SET subscription_status = $1,
          trial_ends_at = $2,
          updated_at = NOW()
      WHERE stripe_subscription_id = $3
    `, [
      subscription.status,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      subscription.id,
    ]).catch(e => console.error('DB update failed in subscription updated:', e.message));

    // Also keep Clerk in sync
    const users = await clerkClient.users.getUserList({ limit: 500 });
    const user = users.data.find(u => u.publicMetadata?.stripeSubscriptionId === subscription.id);
    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: { ...user.publicMetadata, subscriptionStatus: subscription.status },
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

    // Write churn to DB
    await query(`
      UPDATE customers
      SET subscription_status = 'canceled',
          churned_at = NOW(),
          plan = 'free',
          updated_at = NOW()
      WHERE stripe_subscription_id = $1
    `, [subscription.id]).catch(e => console.error('DB update failed in subscription deleted:', e.message));

    // Also keep Clerk in sync
    const users = await clerkClient.users.getUserList({ limit: 500 });
    const user = users.data.find(u => u.publicMetadata?.stripeSubscriptionId === subscription.id);
    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'canceled',
          subscriptionPlan: null,
          canceledAt: new Date().toISOString(),
        },
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

    // Write past_due to DB
    await query(`
      UPDATE customers
      SET subscription_status = 'past_due',
          updated_at = NOW()
      WHERE stripe_customer_id = $1
    `, [invoice.customer]).catch(e => console.error('DB update failed in payment failed:', e.message));

    // Also keep Clerk in sync
    const users = await clerkClient.users.getUserList({ limit: 500 });
    const user = users.data.find(u => u.publicMetadata?.stripeCustomerId === invoice.customer);
    if (user) {
      await clerkClient.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          subscriptionStatus: 'past_due',
          lastPaymentFailed: new Date().toISOString(),
        },
      });
      console.log(`Payment failed for user ${user.id}`);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}
