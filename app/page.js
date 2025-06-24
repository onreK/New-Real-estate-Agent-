'use client';

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            AI Business Automation Platform
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Create your AI-powered business website with enhanced lead scoring, 
            automated conversations, and real-time SMS alerts in minutes.
          </p>
        </div>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto">
          <SignedOut>
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Get Started Today
                </h2>
                <p className="text-gray-600">
                  Start your 14-day free trial of AI business automation
                </p>
              </div>

              {/* Sign In Button */}
              <div className="space-y-4">
                <SignInButton mode="modal">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200">
                    Sign In / Create Account
                  </button>
                </SignInButton>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    No credit card required • 14-day free trial
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">What you get:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    AI-powered customer chat with lead scoring
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Professional business website
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Real-time SMS notifications
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Google Sheets & Calendly integration
                  </li>
                </ul>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="mb-6">
                <UserButton />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome back!
              </h2>
              <p className="text-gray-600 mb-6">
                Redirecting you to your dashboard...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </SignedIn>
        </div>

        {/* Demo Link */}
        <div className="text-center mt-12">
          <a 
            href="/amanda" 
            className="text-blue-200 hover:text-white underline transition duration-200"
          >
            View Demo: Amanda's Real Estate Site →
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-blue-200">
          <p>&copy; 2025 AI Business Automation Platform. Transform your business today.</p>
        </div>
      </div>
    </div>
  );
}
