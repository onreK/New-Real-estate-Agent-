'use client';

import { useState } from 'react';

export default function SMSSetupGuide() {
  const [currentStep, setCurrentStep] = useState(1);
  const [webhookUrl, setWebhookUrl] = useState('');

  const steps = [
    {
      title: "Twilio Account Setup",
      content: (
        <div className="space-y-4">
          <p>First, you need a Twilio account to handle SMS:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to <a href="https://www.twilio.com" target="_blank" className="text-blue-600 hover:underline">twilio.com</a> and create an account</li>
            <li>Complete account verification (phone number, identity)</li>
            <li>Add funding to your account ($20 minimum recommended)</li>
            <li>Navigate to Console → Account → API Keys & Tokens</li>
          </ol>
          
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <h4 className="font-semibold text-blue-800 mb-2">💰 Pricing Info:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• SMS: $0.0075 per message sent/received</li>
              <li>• Phone number: $1/month</li>
              <li>• Perfect for small businesses!</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Get API Credentials", 
      content: (
        <div className="space-y-4">
          <p>Copy these values from your Twilio Console:</p>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Account SID</h4>
              <p className="text-sm text-gray-600 mb-2">Found on your Twilio Console Dashboard</p>
              <code className="bg-gray-100 p-2 rounded text-sm block">
                Starts with: AC...
              </code>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Auth Token</h4>
              <p className="text-sm text-gray-600 mb-2">Click "View" to reveal your auth token</p>
              <code className="bg-gray-100 p-2 rounded text-sm block">
                32-character string
              </code>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🔒 Security Note:</h4>
            <p className="text-sm text-yellow-700">Never share these credentials publicly or commit them to version control!</p>
          </div>
        </div>
      )
    },
    {
      title: "Add Environment Variables",
      content: (
        <div className="space-y-4">
          <p>Add these to your Vercel environment variables:</p>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div>TWILIO_ACCOUNT_SID=AC...</div>
            <div>TWILIO_AUTH_TOKEN=your_auth_token</div>
            <div>NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app</div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">How to add in Vercel:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to your Vercel dashboard</li>
              <li>Select your project</li>
              <li>Go to Settings → Environment Variables</li>
              <li>Add each variable above</li>
              <li>Redeploy your application</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Configure Webhook",
      content: (
        <div className="space-y-4">
          <p>Set up the webhook URL for SMS messages:</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Webhook URL:</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-app.vercel.app/api/sms/webhook"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📱 Webhook Setup:</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Go to Twilio Console → Phone Numbers → Manage → Active Numbers</li>
                <li>Click on your phone number</li>
                <li>In "Messaging" section, set webhook URL to: <code className="bg-white px-1 rounded">{webhookUrl || 'your-app.vercel.app/api/sms/webhook'}</code></li>
                <li>Set HTTP method to "POST"</li>
                <li>Save configuration</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Purchase Phone Number",
      content: (
        <div className="space-y-4">
          <p>Get a phone number for your SMS AI:</p>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Option 1: Through Twilio Console</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Go to Phone Numbers → Manage → Buy a number</li>
                <li>Choose your country (US)</li>
                <li>Filter by "SMS" capability</li>
                <li>Select a number and purchase ($1/month)</li>
                <li>Configure webhook as described in Step 4</li>
              </ol>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Option 2: Through SMS Dashboard</h4>
              <p className="text-sm text-gray-600 mb-2">After deployment, use our SMS dashboard to purchase and configure numbers automatically.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                Go to SMS Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Test & Launch",
      content: (
        <div className="space-y-4">
          <p>Your SMS AI is ready! Here's how to test:</p>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Testing Steps:</h4>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Send a text to your new business number</li>
                <li>Check SMS Dashboard for the conversation</li>
                <li>Verify AI responds with your business info</li>
                <li>Test different message types</li>
              </ol>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Monitoring:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• View all conversations in SMS Dashboard</li>
                <li>• Track leads and response times</li>
                <li>• Monitor usage and costs</li>
                <li>• Adjust AI personality as needed</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <a 
                href="/sms-dashboard" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700"
              >
                📱 SMS Dashboard
              </a>
              <a 
                href="/ai-config" 
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-center hover:bg-gray-700"
              >
                ⚙️ AI Configuration
              </a>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">📱 SMS AI Setup Guide</h1>
            <p className="text-gray-600 mt-2">
              Set up two-way SMS conversations with your AI assistant
            </p>
          </div>

          {/* Progress Bar */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index + 1 <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 mx-2 ${
                      index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Step Content */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Step {currentStep}: {steps[currentStep - 1].title}
            </h2>
            {steps[currentStep - 1].content}
          </div>

          {/* Navigation */}
          <div className="p-6 border-t flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <div className="flex space-x-2">
              <a 
                href="/dashboard" 
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Dashboard
              </a>
              
              {currentStep < steps.length ? (
                <button
                  onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <a 
                  href="/sms-dashboard" 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✅ Go to SMS Dashboard
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
