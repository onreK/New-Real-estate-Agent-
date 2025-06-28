import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const getStripe = () => {
  if (typeof window !== 'undefined') {
    return import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    );
  }
  return null;
};

// Pricing Plans Configuration
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 49,
    priceId: 'price_starter', // You'll replace this with actual Stripe price ID
    features: [
      'Up to 5 AI automations',
      'Basic chat bot',
      'Email support',
      '1,000 messages/month',
      'Basic analytics'
    ],
    popular: false
  },
  professional: {
    name: 'Professional', 
    price: 149,
    priceId: 'price_professional', // You'll replace this with actual Stripe price ID
    features: [
      'Unlimited AI automations',
      'Advanced chat bot + SMS',
      'Voice representative',
      'Priority support',
      '10,000 messages/month',
      'Advanced analytics',
      'Calendar integration'
    ],
    popular: true
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    priceId: 'price_enterprise', // You'll replace this with actual Stripe price ID
    features: [
      'Everything in Professional',
      'Custom AI training',
      'Dedicated support',
      'Unlimited messages',
      'Custom integrations',
      'White-label option',
      'API access'
    ],
    popular: false
  }
};

// Plan feature limits
export const PLAN_LIMITS = {
  starter: {
    automations: 5,
    messagesPerMonth: 1000,
    features: ['chat', 'email']
  },
  professional: {
    automations: -1, // unlimited
    messagesPerMonth: 10000,
    features: ['chat', 'sms', 'voice', 'email', 'calendar']
  },
  enterprise: {
    automations: -1, // unlimited
    messagesPerMonth: -1, // unlimited
    features: ['chat', 'sms', 'voice', 'email', 'calendar', 'api', 'custom']
  }
};
