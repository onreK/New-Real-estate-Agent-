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

export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: 'price_1TcLVq01O3SsJO6lr6j8MbWK',
    features: [
      '300 AI responses/month',
      'Email AI — auto-reply to leads',
      'SMS AI — text message automation',
      'Web Chat — embeddable chat widget',
      'Scheduling — connect your booking link',
      'Lead tracking & export',
      '1 user seat',
    ],
    popular: false
  },
  professional: {
    name: 'Professional',
    price: 69,
    priceId: 'price_1TcLVr01O3SsJO6lyOqWsyhT',
    features: [
      'Everything in Starter',
      '1,500 AI responses/month',
      'Facebook Messenger AI',
      'Instagram DM AI',
      'Full analytics dashboard',
      '2 user seats',
    ],
    popular: true
  },
  business: {
    name: 'Business',
    price: 199,
    priceId: 'price_1TcLVs01O3SsJO6lUmCp5Ojl',
    features: [
      'Everything in Professional',
      '5,000 AI responses/month',
      'AI Voice calls (coming soon)',
      '5 user seats',
      'Priority support',
    ],
    popular: false
  }
};

// Plan feature limits — used for enforcement across the app
export const PLAN_LIMITS = {
  starter: {
    responsesPerMonth: 300,
    channels: ['email', 'sms', 'chat', 'scheduling'],
    seats: 1,
  },
  professional: {
    responsesPerMonth: 1500,
    channels: ['email', 'sms', 'chat', 'scheduling', 'facebook', 'instagram'],
    seats: 2,
  },
  business: {
    responsesPerMonth: 5000,
    channels: ['email', 'sms', 'chat', 'scheduling', 'facebook', 'instagram', 'voice'],
    seats: 5,
  }
};
