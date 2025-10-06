import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

// Lazy load Stripe to prevent build errors
let Stripe;
let stripe;

async function initializeStripe() {
  if (!stripe) {
    Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// Lazy load database
let getDbClient;

async function initializeDatabase() {
  if (!getDbClient) {
    const db = await import('@/lib/database');
    getDbClient = db.getDbClient;
  }
  return getDbClient;
}

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, priceId } = await request.json();
    
    if (!code) {
      return NextResponse.json({ 
        error: 'Discount code is required' 
      }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = await initializeStripe();
    
    // Look up the promotion code in Stripe
    const promotionCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1
    });

    if (promotionCodes.data.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired discount code' 
      }, { status: 400 });
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon;

    // Check if coupon has expired
    if (coupon.redeem_by && new Date(coupon.redeem_by * 1000) < new Date()) {
      return NextResponse.json({ 
        error: 'This discount code has expired' 
      }, { status: 400 });
    }

    // Check if coupon is valid for the selected price
    if (promoCode.restrictions.first_time_transaction && user.publicMetadata?.stripeCustomerId) {
      // Check if this is really their first purchase
      const customer = await stripe.customers.retrieve(user.publicMetadata.stripeCustomerId);
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        return NextResponse.json({ 
          error: 'This code is only valid for new customers' 
        }, { status: 400 });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    let discountDisplay = '';
    
    if (coupon.percent_off) {
      discountAmount = coupon.percent_off;
      discountDisplay = `${coupon.percent_off}% off`;
      if (coupon.duration === 'repeating') {
        discountDisplay += ` for ${coupon.duration_in_months} months`;
      } else if (coupon.duration === 'forever') {
        discountDisplay += ' forever';
      } else {
        discountDisplay += ' first month';
      }
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off / 100; // Convert cents to dollars
      discountDisplay = `$${discountAmount} off`;
      if (coupon.duration === 'repeating') {
        discountDisplay += ` for ${coupon.duration_in_months} months`;
      } else if (coupon.duration === 'forever') {
        discountDisplay += ' every month';
      } else {
        discountDisplay += ' first month';
      }
    }

    // Save the pending promo code to database
    const getDbClient = await initializeDatabase();
    const client = await getDbClient().connect();
    
    try {
      // Get customer ID
      const customerResult = await client.query(
        'SELECT id FROM customers WHERE clerk_user_id = $1',
        [user.id]
      );

      if (customerResult.rows.length === 0) {
        // Create customer if doesn't exist
        await client.query(`
          INSERT INTO customers (clerk_user_id, email, full_name, pending_promo_code, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (clerk_user_id) DO UPDATE 
          SET pending_promo_code = $4
        `, [
          user.id,
          user.emailAddresses[0]?.emailAddress,
          `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          promoCode.id
        ]);
      } else {
        // Update existing customer with pending promo code
        await client.query(
          'UPDATE customers SET pending_promo_code = $1 WHERE clerk_user_id = $2',
          [promoCode.id, user.id]
        );
      }

      return NextResponse.json({
        valid: true,
        discount: {
          code: code.toUpperCase(),
          description: discountDisplay,
          amount: discountAmount,
          type: coupon.percent_off ? 'percent' : 'fixed',
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          promoCodeId: promoCode.id
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json({ 
      error: 'Failed to validate discount code',
      details: error.message 
    }, { status: 500 });
  }
}
