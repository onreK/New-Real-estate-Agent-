'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function EmailSetup() {
  const { user } = useUser();
  const [setupMethod, setSetupMethod] = useState('intellihub'); // 'intellihub' or 'custom'
  const [customDomain, setCustomDomain] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [emailSettings, setEmailSettings] = useState(null);

  useEffect(() => {
    if (user) {
      loadCustomerData();
      loadEmailSettings();
    }
  }, [user]);

  const loadCustomerData = async () => {
    try {
      const response = await fetch('/api/customer/profile');
      const data = await response.json();
      if (data.success) {
        setCustomer(data.customer);
        setBusinessName(data.customer.business_name || '');
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/customer/email-settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setEmailSettings(data.settings);
        setSetupMethod(data.settings.setup_method || 'intellihub');
        setCustomDomain(data.settings.custom_domain || '');
        setCurrentEmail(data.settings.email_address || '');
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    try {
      const settings = {
        setup_method: setupMethod,
        custom_domain: setupMethod === 'custom' ? customDomain : null,
        business_name: businessName,
        email_address: setupMethod === 'intellihub' 
          ? `${businessName.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`
          : `${currentEmail.split('@')[0]}@${customDomain}`
      };

      const response = await fetch('/api/customer/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        setEmailSettings(data.settings);
        alert('Email settings saved successfully!');
      } else {
        alert('Error saving settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const generateIntelliHubEmail = () => {
    if (businessName) {
      return `${businessName.toLowerCase().replace(/\s+/g, '')}@intellihub.ai`;
    }
    return 'yourbusiness@intellihub.ai';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📧 Email AI Setup</h1>
              <p className="text-sm text-gray-600">Connect your email to IntelliHub AI</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/email"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
              >
                ← Back to Email
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Setup Method Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose Email Setup Method</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IntelliHub Email Option */}
            <div 
              onClick={() => setSetupMethod('intellihub')}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                setupMethod === 'intellihub' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 ml-3">IntelliHub Email</h3>
              </div>
              <p className="text-gray-600 mb-4">Get a professional email address hosted by IntelliHub</p>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-500">Your email will be:</p>
                <p className="font-mono text-blue-600">{generateIntelliHubEmail()}</p>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-green-600 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Works immediately</span>
                </div>
                <div className="flex items-center text-green-600 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">No technical setup</span>
                </div>
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Professional appearance</span>
                </div>
              </div>
            </div>

            {/* Custom Domain Option */}
            <div 
              onClick={() => setSetupMethod('custom')}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                setupMethod === 'custom' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 ml-3">Your Domain</h3>
              </div>
              <p className="text-gray-600 mb-4">Use your existing business email domain</p>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-500">Example:</p>
                <p className="font-mono text-purple-600">agent@yourbusiness.com</p>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-green-600 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Your brand/domain</span>
                </div>
                <div className="flex items-center text-green-600 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Maximum professionalism</span>
                </div>
                <div className="flex items-center text-orange-500">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Requires DNS setup</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Email Configuration</h2>
          
          {/* Business Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Smith Realty"
            />
          </div>

          {setupMethod === 'custom' && (
            <>
              {/* Custom Domain */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Domain
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="yourbusiness.com"
                />
              </div>

              {/* Current Email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="agent@yourbusiness.com"
                />
              </div>

              {/* DNS Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-yellow-800 mb-3">
                  🔧 DNS Setup Required
                </h3>
                <p className="text-yellow-700 mb-4">
                  To use your custom domain, you'll need to update your DNS settings:
                </p>
                <div className="bg-white rounded-lg p-4 font-mono text-sm">
                  <p className="text-gray-600 mb-2">Add these MX records to your domain:</p>
                  <p className="text-blue-600">MX 10 mx1.resend.com</p>
                  <p className="text-blue-600">MX 20 mx2.resend.com</p>
                </div>
                <p className="text-yellow-700 mt-4 text-sm">
                  Contact your domain provider (GoDaddy, Namecheap, etc.) for help with DNS changes.
                </p>
              </div>
            </>
          )}

          {/* Email Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-blue-800 mb-3">
              📧 Your AI Email Address
            </h3>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Customers will email:</p>
              <p className="text-2xl font-mono text-blue-600">
                {setupMethod === 'intellihub' 
                  ? generateIntelliHubEmail()
                  : customDomain 
                    ? `${currentEmail.split('@')[0] || 'agent'}@${customDomain}`
                    : 'agent@yourdomain.com'
                }
              </p>
              <p className="text-sm text-gray-500 mt-3">
                All emails to this address will get instant AI responses!
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/email"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={saveEmailSettings}
              disabled={saving || !businessName}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>

          {emailSettings && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800 font-medium">Email AI is configured and active!</p>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Your customers can now email {emailSettings.email_address} and get instant AI responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
