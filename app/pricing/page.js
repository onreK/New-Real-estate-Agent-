'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Check, Zap, Star, Crown, ArrowRight } from 'lucide-react';
import { PRICING_PLANS } from '../../lib/stripe';

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleSubscribe = async (priceId, planName) => {
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }

    setLoading(planName);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, planName }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(({ loadStripe }) =>
        loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      );
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const PlanIcon = ({ plan }) => {
    switch (plan) {
      case 'starter': return <Zap className="w-8 h-8 text-blue-500" />;
      case 'professional': return <Star className="w-8 h-8 text-purple-500" />;
      case 'enterprise': return <Crown className="w-8 h-8 text-amber-500" />;
      default: return <Zap className="w-8 h-8 text-blue-500" />;
    }
  };

  const getCurrentPlan = () => {
    return user?.publicMetadata?.subscriptionPlan || null;
  };

  const getSubscriptionStatus = () => {
    return user?.publicMetadata?.subscriptionStatus || null;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const subscriptionStatus = getSubscriptionStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your <span className="text-purple-400">IntelliHub AI</span> Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Transform your business with AI automation. Start small, scale unlimited.
          </p>
          
          {currentPlan && (
            <div className="mt-6 inline-flex items-center bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30">
              <Check className="w-4 h-4 mr-2" />
              Currently on {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
              {subscriptionStatus === 'active' ? ' (Active)' : ` (${subscriptionStatus})`}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(PRICING_PLANS).map(([key, plan]) => {
            const isCurrentPlan = currentPlan === key;
            const isPopular = plan.popular;
            
            return (
              <div
                key={key}
                className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border transition-all duration-300 hover:scale-105 ${
                  isPopular 
                    ? 'border-purple-500 scale-105 shadow-2xl shadow-purple-500/25' 
                    : isCurrentPlan
                    ? 'border-green-500 shadow-xl shadow-green-500/25'
                    : 'border-white/20 hover:border-purple-300'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <PlanIcon plan={key} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-white mb-2">
                    ${plan.price}
                    <span className="text-lg text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 text-sm">Perfect for {key === 'starter' ? 'small businesses' : key === 'professional' ? 'growing companies' : 'enterprise clients'}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={loading === plan.name || isCurrentPlan}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    isCurrentPlan
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                      : isPopular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/40'
                  } ${loading === plan.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.name ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    <div className="flex items-center justify-center">
                      {isSignedIn ? `Upgrade to ${plan.name}` : `Start with ${plan.name}`}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What's Included</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-6 bg-white/5">
              <div className="font-semibold text-white">Features</div>
              <div className="text-center font-semibold text-blue-400">Starter</div>
              <div className="text-center font-semibold text-purple-400">Professional</div>
              <div className="text-center font-semibold text-amber-400">Enterprise</div>
            </div>
            
            {[
              ['AI Chat Bot', true, true, true],
              ['SMS Assistant', false, true, true],
              ['Voice Representative', false, true, true],
              ['Email Automation', true, true, true],
              ['Calendar Integration', false, true, true],
              ['Advanced Analytics', false, true, true],
              ['API Access', false, false, true],
              ['Custom Integrations', false, false, true],
              ['White-label Option', false, false, true],
            ].map(([feature, starter, professional, enterprise], index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border-t border-white/10">
                <div className="text-gray-300">{feature}</div>
                <div className="text-center">
                  {starter ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-gray-500">—</span>}
                </div>
                <div className="text-center">
                  {professional ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-gray-500">—</span>}
                </div>
                <div className="text-center">
                  {enterprise ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-gray-500">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately."
              },
              {
                q: "Is there a free trial?",
                a: "All plans come with a 14-day free trial. No credit card required to start exploring IntelliHub AI."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards and debit cards through our secure Stripe integration."
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-left">
                <h3 className="text-xl font-semibold text-white mb-3">{faq.q}</h3>
                <p className="text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-8 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Business?</h2>
            <p className="text-gray-300 mb-6">
              Join thousands of businesses already using IntelliHub AI to automate their operations and boost productivity.
            </p>
            {!isSignedIn && (
              <button
                onClick={() => router.push('/sign-up')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                Start Your Free Trial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
