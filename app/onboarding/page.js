'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | creating | done | error

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }

    async function ensureCustomerRecord() {
      setStatus('creating');
      try {
        const res = await fetch('/api/create-customer', { method: 'POST' });
        const data = await res.json();

        if (res.ok || data.success) {
          setStatus('done');
          setTimeout(() => router.push('/dashboard'), 1200);
        } else {
          console.error('Customer creation failed:', data);
          setStatus('error');
        }
      } catch (err) {
        console.error('Onboarding error:', err);
        setStatus('error');
      }
    }

    ensureCustomerRecord();
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {status === 'loading' || status === 'creating' ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Setting up your account...</h1>
            <p className="text-gray-400">Just a moment while we get everything ready for you.</p>
          </>
        ) : status === 'done' ? (
          <>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You're all set!</h1>
            <p className="text-gray-400">Taking you to your dashboard...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-6">We couldn't finish setting up your account.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard Anyway
            </button>
          </>
        )}
      </div>
    </div>
  );
}
