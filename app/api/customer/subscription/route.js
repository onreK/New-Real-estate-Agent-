import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

// Lazy load database and Stripe to prevent build errors
let getDbClient;
let Stripe;
let stripe;

// Initialize connections only when needed
async function initializeConnections() {
  if (!getDbClient) {
    const db = await import('@/lib/database');
    getDbClient = db.getDbClient;
  }
  
  if (!stripe) {
    Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  
  return { getDbClient, stripe };
}

// Your actual Stripe price IDs
const STRIPE_PRICE_IDS = {
  starter: 'price_1ResOf02X1Dd2GE6KvOoZQIm',
  professional: 'price_1ResRt02X1Dd2GE6V0ZNpRv5',
  enterprise: 'price_1ResT402X1Dd2GE6Y0KIFfqD'
};

const PLAN_DETAILS = {
  starter: {
    name: 'Starter',
    price: 99,
    features: {
      conversations: 500,
      emailResponses: 1000,
      smsMessages: 200,
      aiAgents: 1,
      teamMembers: 2,
      integrations: 3
    }
  },
  professional: {
    name: 'Professional',
    price: 299,
    features: {
      conversations: 2000,
      emailResponses: 5000,
      smsMessages: 1000,
      aiAgents: 3,
      teamMembers: 10,
      integrations: 'All'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 799,
    features: {
      conversations: 'Unlimited',
      emailResponses: 'Unlimited',
      smsMessages: 5000,
      aiAgents: 'Unlimited',
      teamMembers: 'Unlimited',
      integrations: 'Custom'
    }
  }
};

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize connections
    const { getDbClient, stripe } = await initializeConnections();
    
    // Try to get database connection
    let client;
    try {
      client = await getDbClient().connect();
    } catch (dbError) {
      console.log('Database not available, returning default subscription');
      // Return default subscription if database is not available
      return NextResponse.json({ 
        subscription: {
          plan: 'starter',
          status: 'trialing',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          planDetails: PLAN_DETAILS.starter,
          usage: {
            conversations: 0,
            emailResponses: 0,
            smsMessages: 0,
            maxConversations: 500,
            maxEmailResponses: 1000,
            maxSmsMessages: 200
          }
        },
        plans: PLAN_DETAILS
      });
    }
    
    try {
      // Get customer from database
      const customerQuery = 'SELECT * FROM customers WHERE clerk_user_id = $1';
      const customerResult = await client.query(customerQuery, [user.id]);
      
      if (customerResult.rows.length === 0) {
        // Return trial status if no customer yet
        return NextResponse.json({ 
          subscription: {
            plan: 'starter',
            status: 'trialing',
            trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            planDetails: PLAN_DETAILS.starter,
            usage: {
              conversations: 0,
              emailResponses: 0,
              smsMessages: 0,
              maxConversations: 500,
              maxEmailResponses: 1000,
              maxSmsMessages: 200
            }
          },
          plans: PLAN_DETAILS
        });
      }
      
      const customer = customerResult.rows[0];
      
      // If customer has Stripe subscription, get real data from Stripe
      if (customer.stripe_subscription_id && stripe) {
        try {
          // Get subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            customer.stripe_subscription_id
          );
          
          // Get usage from database - with safe fallback
          let usage = { conversations: 0, email_responses: 0, sms_messages: 0 };
          try {
            const usageQuery = `
              SELECT 
                COUNT(DISTINCT CASE WHEN type = 'conversation' AND created_at >= date_trunc('month', CURRENT_DATE) THEN id END) as conversations,
                COUNT(DISTINCT CASE WHEN type = 'email' AND created_at >= date_trunc('month', CURRENT_DATE) THEN id END) as email_responses,
                COUNT(DISTINCT CASE WHEN type = 'sms' AND created_at >= date_trunc('month', CURRENT_DATE) THEN id END) as sms_messages
              FROM customer_usage 
              WHERE customer_id = $1
            `;
            const usageResult = await client.query(usageQuery, [customer.id]);
            if (usageResult.rows[0]) {
              usage = usageResult.rows[0];
            }
          } catch (usageError) {
            console.log('Usage table not available yet');
          }
          
          // Determine plan from price ID
          let planName = 'starter';
          const priceId = stripeSubscription.items.data[0]?.price.id;
          
          if (priceId === STRIPE_PRICE_IDS.professional) {
            planName = 'professional';
          } else if (priceId === STRIPE_PRICE_IDS.enterprise) {
            planName = 'enterprise';
          }
          
          // Check if subscription has a discount
          let discountInfo = null;
          if (stripeSubscription.discount) {
            discountInfo = {
              coupon: stripeSubscription.discount.coupon.name || stripeSubscription.discount.coupon.id,
              percentOff: stripeSubscription.discount.coupon.percent_off,
              amountOff: stripeSubscription.discount.coupon.amount_off,
              valid: stripeSubscription.discount.end ? new Date(stripeSubscription.discount.end * 1000) > new Date() : true
            };
          }
          
          return NextResponse.json({ 
            success: true,
            subscription: {
              id: stripeSubscription.id,
              plan: planName,
              status: stripeSubscription.status,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000),
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
              trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
              planDetails: PLAN_DETAILS[planName],
              discount: discountInfo,
              usage: {
                conversations: parseInt(usage.conversations) || 0,
                emailResponses: parseInt(usage.email_responses) || 0,
                smsMessages: parseInt(usage.sms_messages) || 0,
                maxConversations: PLAN_DETAILS[planName].features.conversations,
                maxEmailResponses: PLAN_DETAILS[planName].features.emailResponses,
                maxSmsMessages: PLAN_DETAILS[planName].features.smsMessages
              }
            },
            plans: PLAN_DETAILS
          });
          
        } catch (stripeError) {
          console.error('Stripe error:', stripeError);
          // Fall back to database data if Stripe fails
        }
      }
      
      // Return default subscription data
      return NextResponse.json({ 
        success: true,
        subscription: {
          plan: customer.plan || 'starter',
          status: 'trialing',
          planDetails: PLAN_DETAILS[customer.plan || 'starter'],
          usage: {
            conversations: 0,
            emailResponses: 0,
            smsMessages: 0,
            maxConversations: PLAN_DETAILS[customer.plan || 'starter'].features.conversations,
            maxEmailResponses: PLAN_DETAILS[customer.plan || 'starter'].features.emailResponses,
            maxSmsMessages: PLAN_DETAILS[customer.plan || 'starter'].features.smsMessages
          }
        },
        plans: PLAN_DETAILS
      });
      
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    // Return default data on any error
    return NextResponse.json({ 
      subscription: {
        plan: 'starter',
        status: 'trialing',
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        planDetails: PLAN_DETAILS.starter,
        usage: {
          conversations: 0,
          emailResponses: 0,
          smsMessages: 0,
          maxConversations: 500,
          maxEmailResponses: 1000,
          maxSmsMessages: 200
        }
      },
      plans: PLAN_DETAILS
    });
  }
}

// Handle subscription changes (upgrade, downgrade, apply discount)
export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, plan, discountCode } = await request.json();
    
    console.log('🔵 Subscription POST action:', action, 'Plan:', plan, 'Discount Code:', discountCode);
    
    // Initialize connections
    const { getDbClient, stripe } = await initializeConnections();
    
    // Get database client
    let client;
    try {
      client = await getDbClient().connect();
    } catch (dbError) {
      return NextResponse.json({ 
        error: 'Database temporarily unavailable. Please try again.' 
      }, { status: 503 });
    }
    
    try {
      // Get customer
      const customerQuery = 'SELECT * FROM customers WHERE clerk_user_id = $1';
      const customerResult = await client.query(customerQuery, [user.id]);
      
      if (customerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      
      const customer = customerResult.rows[0];
      
      // 🎯 FIXED: Handle discount code application with case-insensitive search
      if (action === 'apply_discount') {
        if (!discountCode) {
          return NextResponse.json({ error: 'Discount code required' }, { status: 400 });
        }
        
        console.log('🔍 Searching for promotion code:', discountCode);
        
        try {
          // Try exact match first
          let promotionCodes = await stripe.promotionCodes.list({
            code: discountCode,
            active: true,
            limit: 1
          });
          
          console.log('📋 Exact match result:', promotionCodes.data.length, 'codes found');
          
          // If no exact match, try case-insensitive search
          if (promotionCodes.data.length === 0) {
            console.log('🔄 Trying case-insensitive search...');
            
            // Get all active promotion codes
            const allPromoCodes = await stripe.promotionCodes.list({
              active: true,
              limit: 100
            });
            
            console.log('📊 Total active promo codes in Stripe:', allPromoCodes.data.length);
            
            // Find matching code (case-insensitive)
            const matchedCode = allPromoCodes.data.find(
              pc => pc.code.toUpperCase() === discountCode.toUpperCase()
            );
            
            if (matchedCode) {
              promotionCodes = { data: [matchedCode] };
              console.log('✅ Found code with case-insensitive match:', matchedCode.code);
            } else {
              console.log('❌ No matching code found. Available codes:', 
                allPromoCodes.data.map(pc => pc.code).join(', '));
              
              return NextResponse.json({ 
                error: 'Invalid or expired discount code',
                details: `Code "${discountCode}" not found. Please check spelling and try again.`,
                availableCodes: allPromoCodes.data.length > 0 ? 
                  `${allPromoCodes.data.length} active codes available` : 
                  'No active codes available'
              }, { status: 400 });
            }
          }
          
          const promoCode = promotionCodes.data[0];
          console.log('✅ Valid promo code found:', {
            id: promoCode.id,
            code: promoCode.code,
            couponId: promoCode.coupon.id,
            percentOff: promoCode.coupon.percent_off,
            amountOff: promoCode.coupon.amount_off
          });
          
          // If customer has active subscription, apply discount immediately
          if (customer.stripe_subscription_id) {
            console.log('📝 Applying discount to existing subscription:', customer.stripe_subscription_id);
            
            try {
              const subscription = await stripe.subscriptions.update(
                customer.stripe_subscription_id,
                {
                  promotion_code: promoCode.id
                }
              );
              
              console.log('✅ Discount applied successfully to subscription');
              
              return NextResponse.json({ 
                success: true,
                message: `Discount "${promoCode.coupon.name || promoCode.code}" applied successfully!`,
                discount: {
                  code: promoCode.code,
                  percentOff: promoCode.coupon.percent_off,
                  amountOff: promoCode.coupon.amount_off
                }
              });
            } catch (updateError) {
              console.error('❌ Error applying discount to subscription:', updateError);
              throw updateError;
            }
          } else {
            // No active subscription - store for future checkout
            console.log('💾 Storing promo code for future subscription');
            
            await client.query(
              'UPDATE customers SET pending_promo_code = $1 WHERE id = $2',
              [promoCode.id, customer.id]
            );
            
            console.log('✅ Promo code stored successfully');
            
            return NextResponse.json({ 
              success: true,
              message: 'Discount code validated! It will be applied when you subscribe.',
              discount: {
                code: promoCode.code,
                percentOff: promoCode.coupon.percent_off,
                amountOff: promoCode.coupon.amount_off
              }
            });
          }
        } catch (stripeError) {
          console.error('❌ Stripe discount error:', stripeError);
          console.error('Error message:', stripeError.message);
          console.error('Error type:', stripeError.type);
          
          return NextResponse.json({ 
            error: 'Invalid or expired discount code',
            details: stripeError.message
          }, { status: 400 });
        }
      }
      
      // Handle plan changes
      if (action === 'upgrade' || action === 'downgrade') {
        const priceId = STRIPE_PRICE_IDS[plan];
        
        if (!priceId) {
          return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }
        
        // Create or get Stripe customer
        let stripeCustomerId = customer.stripe_customer_id;
        
        if (!stripeCustomerId) {
          const stripeCustomer = await stripe.customers.create({
            email: customer.email,
            metadata: {
              clerkUserId: user.id,
              customerId: customer.id.toString()
            }
          });
          
          stripeCustomerId = stripeCustomer.id;
          
          // Update database with Stripe customer ID
          await client.query(
            'UPDATE customers SET stripe_customer_id = $1 WHERE id = $2',
            [stripeCustomerId, customer.id]
          );
        }
        
        // Check if customer has active subscription
        if (customer.stripe_subscription_id) {
          // Update existing subscription
          try {
            const subscription = await stripe.subscriptions.retrieve(customer.stripe_subscription_id);
            
            // Update the subscription with new price
            await stripe.subscriptions.update(customer.stripe_subscription_id, {
              items: [{
                id: subscription.items.data[0].id,
                price: priceId
              }],
              proration_behavior: 'always_invoice'
            });
            
            // Update local database
            await client.query(
              'UPDATE customers SET plan = $1, updated_at = NOW() WHERE id = $2',
              [plan, customer.id]
            );
            
            return NextResponse.json({ 
              success: true,
              message: `Successfully ${action}d to ${plan} plan!`
            });
            
          } catch (stripeError) {
            console.error('Stripe subscription update error:', stripeError);
            return NextResponse.json({ 
              error: 'Failed to update subscription' 
            }, { status: 500 });
          }
        }
        
        // If no subscription, create checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ['card'],
          line_items: [{
            price: priceId,
            quantity: 1
          }],
          mode: 'subscription',
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/settings?success=true&plan=${plan}`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/settings?canceled=true`,
          metadata: {
            clerkUserId: user.id,
            customerId: customer.id.toString(),
            plan: plan
          },
          // Apply pending promo code if exists
          ...(customer.pending_promo_code && { 
            discounts: [{
              promotion_code: customer.pending_promo_code
            }]
          }),
          subscription_data: {
            trial_period_days: 14,
            metadata: {
              clerkUserId: user.id,
              customerId: customer.id.toString()
            }
          }
        });
        
        return NextResponse.json({ 
          success: true,
          redirectUrl: checkoutSession.url 
        });
      }
      
      // Handle subscription cancellation
      if (action === 'cancel') {
        if (!customer.stripe_subscription_id) {
          return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
        }
        
        // Cancel at period end
        await stripe.subscriptions.update(customer.stripe_subscription_id, {
          cancel_at_period_end: true
        });
        
        return NextResponse.json({ 
          success: true,
          message: 'Subscription will be canceled at the end of the billing period'
        });
      }
      
      return NextResponse.json({ 
        error: 'Invalid action' 
      }, { status: 400 });
      
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to update subscription', 
      details: error.message 
    }, { status: 500 });
  }
}
