'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { CheckCircle, ArrowRight, Zap, Sparkles } from 'lucide-react';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const session_id = searchParams.get('session_id');
    setSessionId(session_id);
    
    // Simulate processing time for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const getPlanDetails = () => {
    const plan = user?.publicMetadata?.subscriptionPlan;
    if (!plan) return null;

    const planDetails = {
      starter: {
        name: 'Starter',
        color: 'blue',
        icon: <Zap className="w-6 h-6" />,
        features: ['AI Chat Bot', 'Email Automation', 'Basic Analytics']
      },
      professional: {
        name: 'Professional',
        color: 'purple', 
        icon: <Sparkles className="w-6 h-6" />,
        features: ['Everything in Starter', 'SMS Assistant', 'Voice Representative', 'Calendar Integration']
      },
      enterprise: {
        name: 'Enterprise',
        color: 'amber',
        icon: <Sparkles className="w-6 h-6" />,
        features: ['Everything in Professional', 'API Access', 'Custom Integrations', 'White-label Option']
      }
    };

    return planDetails[plan] || null;
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-pink-500 animate-spin animation-delay-150 mx-auto"></div>
          </div>
          <p className="text-white text-xl">Processing your payment...</p>
          <p className="text-gray-400 text-sm mt-2">Setting up your AI automation platform</p>
        </div>
      </div>
    );
  }

  const planDetails = getPlanDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-500/20 rounded-full blur-xl"></div>
          
          <div className="relative">
            {/* Success Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-full p-4 shadow-lg">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl font-bold text-white mb-4">
              🎉 Payment Successful!
            </h1>
            
            <p className="text-xl text-gray-300 mb-8">
              Welcome to <span className="text-purple-400 font-semibold">IntelliHub AI</span>! 
              Your {planDetails?.name || 'subscription'} plan is now active.
            </p>

            {/* Plan Details */}
            {planDetails && (
              <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20">
                <div className="flex items-center justify-center mb-4">
                  <div className={`text-${planDetails.color}-400 mr-3`}>
                    {planDetails.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white">{planDetails.name} Plan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  {planDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 mb-8 border border-purple-500/30">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                What's Next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {[
                  'Set up your first AI automation',
                  'Configure your business profile',
                  'Connect your communication channels',
                  'Explore premium templates'
                ].map((step, index) => (
                  <div key={index} className="flex items-center text-gray-300">
                    <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center group"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/dashboard/automations')}
                  className="bg-white/10 text-white py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all duration-200"
                >
                  Create Automation
                </button>
                
                <button
                  onClick={() => router.push('/dashboard/settings')}
                  className="bg-white/10 text-white py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all duration-200"
                >
                  Account Settings
                </button>
              </div>
            </div>

            {/* Support Info */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-gray-400">
                Need help getting started? Check out our{' '}
                <button 
                  onClick={() => router.push('/help')}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  quick start guide
                </button>{' '}
                or{' '}
                <button 
                  onClick={() => router.push('/support')}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  contact our support team
                </button>
              </p>
            </div>

            {/* Session ID for debugging (optional) */}
            {sessionId && process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-2 bg-black/20 rounded text-xs text-gray-500 font-mono">
                Session ID: {sessionId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
