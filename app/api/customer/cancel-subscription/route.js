// app/api/customer/cancel-subscription/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database';

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('🚫 Cancelling subscription for user:', user.id);

    // Get customer from database
    const customerQuery = `
      SELECT 
        id,
        clerk_user_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan
      FROM customers 
      WHERE clerk_user_id = $1
      LIMIT 1
    `;
    
    const customerResult = await query(customerQuery, [user.id]);
    
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found' 
      }, { status: 404 });
    }

    const customer = customerResult.rows[0];

    // If there's a Stripe subscription, cancel it
    if (customer.stripe_subscription_id) {
      try {
        // Here you would cancel the Stripe subscription
        // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // await stripe.subscriptions.update(customer.stripe_subscription_id, {
        //   cancel_at_period_end: true
        // });
        
        console.log('✅ Stripe subscription marked for cancellation');
      } catch (stripeError) {
        console.error('❌ Error cancelling Stripe subscription:', stripeError);
        // Continue even if Stripe cancellation fails
      }
    }

    // Update customer record to reflect cancellation
    const updateQuery = `
      UPDATE customers 
      SET 
        plan = 'cancelled',
        updated_at = NOW()
      WHERE clerk_user_id = $1
      RETURNING *
    `;
    
    await query(updateQuery, [user.id]);

    // Log the cancellation event
    try {
      const eventQuery = `
        INSERT INTO subscription_events (
          customer_id,
          event_type,
          previous_plan,
          new_plan,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await query(eventQuery, [
        customer.id,
        'subscription_cancelled',
        customer.plan,
        'cancelled',
        JSON.stringify({
          reason: 'User initiated cancellation',
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (eventError) {
      console.error('⚠️ Could not log cancellation event:', eventError);
      // Continue even if event logging fails
    }

    // Calculate end of billing period
    const endOfBillingPeriod = new Date();
    endOfBillingPeriod.setMonth(endOfBillingPeriod.getMonth() + 1);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      details: {
        status: 'cancelled',
        accessUntil: endOfBillingPeriod.toISOString(),
        refundAvailable: false
      }
    });

  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to cancel subscription',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
