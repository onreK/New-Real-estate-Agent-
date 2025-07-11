// app/facebook-setup/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

export default function FacebookSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [facebookConfig, setFacebookConfig] = useState({
    businessName: '',
    personality: 'professional',
    industry: 'Real Estate',
    welcomeMessage: '',
    enableHotLeadAlerts: true,
    responseStyle: 'helpful',
    pageAccessToken: '',
    verifyToken: '',
    appSecret: ''
  });
  const [setupComplete, setSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    // Set webhook URL based on current domain
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/facebook/webhook`);
    }
  }, []);

  const steps = [
    {
      title: "Business Information",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Business Name *</label>
            <input
              type="text"
              value={facebookConfig.businessName}
              onChange={(e) => setFacebookConfig({...facebookConfig, businessName: e.target.value})}
              placeholder="Your Business Name"
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <select
              value={facebookConfig.industry}
              onChange={(e) => setFacebookConfig({...facebookConfig, industry: e.target.value})}
              className="w-full p-3 border rounded-lg"
            >
              <option value="Real Estate">Real Estate</option>
              <option value="Automotive">Automotive</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Retail">Retail</option>
              <option value="Professional Services">Professional Services</option>
              <option value="Technology">Technology</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI Personality</label>
            <select
              value={facebookConfig.personality}
              onChange={(e) => setFacebookConfig({...facebookConfig, personality: e.target.value})}
              className="w-full p-3 border rounded-lg"
            >
              <option value="professional">Professional & Formal</option>
              <option value="friendly">Friendly & Casual</option>
              <option value="enthusiastic">Enthusiastic & Energetic</option>
              <option value="helpful">Helpful & Supportive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Welcome Message</label>
            <textarea
              value={facebookConfig.welcomeMessage}
              onChange={(e) => setFacebookConfig({...facebookConfig, welcomeMessage: e.target.value})}
              placeholder="Hi! I'm here to help you with any questions about our services. How can I assist you today?"
              className="w-full p-3 border rounded-lg h-20"
            />
          </div>
        </div>
      )
    },
    {
      title: "Facebook App Setup",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📱 Facebook Developer Setup</h4>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>
                Go to{' '}
                <a 
                  href="https://developers.facebook.com" 
                  target="_blank" 
                  className="underline hover:text-blue-900"
                >
                  Facebook Developers <ExternalLink className="inline w-3 h-3" />
                </a>
              </li>
              <li>Click "Create App" → Choose "Consumer" type</li>
              <li>Add your app name and contact email</li>
              <li>Add "Messenger" product to your app</li>
              <li>Generate a Page Access Token for your Facebook page</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Page Access Token *</label>
            <input
              type="password"
              value={facebookConfig.pageAccessToken}
              onChange={(e) => setFacebookConfig({...facebookConfig, pageAccessToken: e.target.value})}
              placeholder="EAAxxxxxxxxxxxxxxxxx..."
              className="w-full p-3 border rounded-lg font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in Messenger Settings → Access Tokens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verify Token *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={facebookConfig.verifyToken}
                onChange={(e) => setFacebookConfig({...facebookConfig, verifyToken: e.target.value})}
                placeholder="your_custom_verify_token"
                className="flex-1 p-3 border rounded-lg"
                required
              />
              <button
                type="button"
                onClick={() => setFacebookConfig({...facebookConfig, verifyToken: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`})}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Create a custom token for webhook verification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">App Secret *</label>
            <input
              type="password"
              value={facebookConfig.appSecret}
              onChange={(e) => setFacebookConfig({...facebookConfig, appSecret: e.target.value})}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full p-3 border rounded-lg font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in App Settings → Basic → App Secret
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Webhook Configuration",
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🔗 Configure Facebook Webhook</h4>
            <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
              <li>In your Facebook app, go to Messenger → Settings</li>
              <li>Find the "Webhooks" section</li>
              <li>Click "Add Callback URL"</li>
              <li>Use the webhook URL and verify token below</li>
              <li>Subscribe to: messages, messaging_postbacks, messaging_optins</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 p-3 border rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verify Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={facebookConfig.verifyToken}
                readOnly
                className="flex-1 p-3 border rounded-lg bg-gray-50"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(facebookConfig.verifyToken)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">📋 Environment Variables</h4>
            <p className="text-sm text-green-700 mb-2">Add these to your Railway environment variables:</p>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs">
              <div>FACEBOOK_PAGE_ACCESS_TOKEN={facebookConfig.pageAccessToken}</div>
              <div>FACEBOOK_VERIFY_TOKEN={facebookConfig.verifyToken}</div>
              <div>FACEBOOK_APP_SECRET={facebookConfig.appSecret}</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "AI Configuration",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Response Style</label>
            <select
              value={facebookConfig.responseStyle}
              onChange={(e) => setFacebookConfig({...facebookConfig, responseStyle: e.target.value})}
              className="w-full p-3 border rounded-lg"
            >
              <option value="helpful">Helpful & Detailed</option>
              <option value="concise">Concise & Direct</option>
              <option value="conversational">Conversational & Engaging</option>
              <option value="professional">Professional & Formal</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={facebookConfig.enableHotLeadAlerts}
              onChange={(e) => setFacebookConfig({...facebookConfig, enableHotLeadAlerts: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="text-sm">Enable hot lead detection and alerts</label>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🤖 AI Preview</h4>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm">
                <strong>Business:</strong> {facebookConfig.businessName || 'Your Business'}<br/>
                <strong>Personality:</strong> {facebookConfig.personality}<br/>
                <strong>Welcome:</strong> {facebookConfig.welcomeMessage || 'Standard welcome message'}
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const validateCurrentStep = () => {
    switch(currentStep) {
      case 0:
        return facebookConfig.businessName.trim() !== '';
      case 1:
        return facebookConfig.pageAccessToken.trim() !== '' && 
               facebookConfig.verifyToken.trim() !== '' && 
               facebookConfig.appSecret.trim() !== '';
      case 2:
        return true; // Webhook step is informational
      case 3:
        return true; // AI config step is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteSetup = async () => {
    if (!validateCurrentStep()) return;

    try {
      setIsLoading(true);
      setError('');

      // Configure Facebook AI
      console.log('⚙️ Configuring Facebook Messenger AI...');
      
      const configResponse = await fetch('/api/facebook/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: facebookConfig
        })
      });

      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error(configData.error || 'Failed to configure Facebook AI');
      }

      console.log('✅ Facebook Messenger AI configured successfully');
      setSetupComplete(true);

    } catch (error) {
      console.error('❌ Setup error:', error);
      setError(error.message || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">
              Facebook Messenger AI Setup Complete!
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Messenger AI is Ready!</h2>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="font-medium">📱 Platform:</span>
                  <span>Facebook Messenger</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🏢 Business:</span>
                  <span>{facebookConfig.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🤖 AI Personality:</span>
                  <span className="capitalize">{facebookConfig.personality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🔥 Hot Lead Alerts:</span>
                  <span>{facebookConfig.enableHotLeadAlerts ? '✅ Enabled' : '❌ Disabled'}</span>
                </div>
              </div>
            </div>

            <div className="space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.open('https://www.facebook.com/your-page', '_blank')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium"
              >
                Test on Facebook
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facebook Messenger AI Setup</h1>
            <p className="text-gray-600">Configure AI-powered customer responses for Facebook Messenger</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {steps[currentStep].content}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleCompleteSetup}
              disabled={isLoading || !validateCurrentStep()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!validateCurrentStep()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
