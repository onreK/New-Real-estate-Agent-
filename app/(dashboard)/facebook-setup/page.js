// app/(dashboard)/facebook-setup/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Copy, ExternalLink, Facebook } from 'lucide-react';

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
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/facebook/webhook`);
    }
  }, []);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const inputClass = "w-full px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-2";

  const steps = [
    {
      title: "Business Information",
      content: (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Business Name *</label>
            <input
              type="text"
              value={facebookConfig.businessName}
              onChange={(e) => setFacebookConfig({...facebookConfig, businessName: e.target.value})}
              placeholder="Your Business Name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Industry</label>
            <select
              value={facebookConfig.industry}
              onChange={(e) => setFacebookConfig({...facebookConfig, industry: e.target.value})}
              className={inputClass}
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
            <label className={labelClass}>AI Personality</label>
            <select
              value={facebookConfig.personality}
              onChange={(e) => setFacebookConfig({...facebookConfig, personality: e.target.value})}
              className={inputClass}
            >
              <option value="professional">Professional & Formal</option>
              <option value="friendly">Friendly & Casual</option>
              <option value="enthusiastic">Enthusiastic & Energetic</option>
              <option value="helpful">Helpful & Supportive</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Welcome Message</label>
            <textarea
              value={facebookConfig.welcomeMessage}
              onChange={(e) => setFacebookConfig({...facebookConfig, welcomeMessage: e.target.value})}
              placeholder="Hi! I'm here to help you with any questions about our services. How can I assist you today?"
              className={`${inputClass} h-24 resize-none`}
            />
          </div>
        </div>
      )
    },
    {
      title: "Facebook App Setup",
      content: (
        <div className="space-y-5">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">Facebook Developer Setup</h4>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>Go to{' '}
                <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-1">
                  Facebook Developers <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Click "Create App" → Choose "Consumer" type</li>
              <li>Add your app name and contact email</li>
              <li>Add "Messenger" product to your app</li>
              <li>Generate a Page Access Token for your Facebook page</li>
            </ol>
          </div>

          <div>
            <label className={labelClass}>Page Access Token *</label>
            <input
              type="password"
              value={facebookConfig.pageAccessToken}
              onChange={(e) => setFacebookConfig({...facebookConfig, pageAccessToken: e.target.value})}
              placeholder="EAAxxxxxxxxxxxxxxxxx..."
              className={`${inputClass} font-mono text-sm`}
            />
            <p className="text-xs text-gray-500 mt-1">Found in Messenger Settings → Access Tokens</p>
          </div>

          <div>
            <label className={labelClass}>Verify Token *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={facebookConfig.verifyToken}
                onChange={(e) => setFacebookConfig({...facebookConfig, verifyToken: e.target.value})}
                placeholder="your_custom_verify_token"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setFacebookConfig({...facebookConfig, verifyToken: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`})}
                className="px-4 py-2 bg-[#161B22] border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 whitespace-nowrap text-sm"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Create a custom token for webhook verification</p>
          </div>

          <div>
            <label className={labelClass}>App Secret *</label>
            <input
              type="password"
              value={facebookConfig.appSecret}
              onChange={(e) => setFacebookConfig({...facebookConfig, appSecret: e.target.value})}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={`${inputClass} font-mono text-sm`}
            />
            <p className="text-xs text-gray-500 mt-1">Found in App Settings → Basic → App Secret</p>
          </div>
        </div>
      )
    },
    {
      title: "Webhook Configuration",
      content: (
        <div className="space-y-5">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="font-semibold text-yellow-400 mb-2">Configure Facebook Webhook</h4>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>In your Facebook app, go to Messenger → Settings</li>
              <li>Find the "Webhooks" section</li>
              <li>Click "Add Callback URL"</li>
              <li>Use the webhook URL and verify token below</li>
              <li>Subscribe to: <strong>messages</strong>, <strong>feed</strong> (for post comments), messaging_postbacks, messaging_optins</li>
            </ol>
          </div>

          <div>
            <label className={labelClass}>Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className={`${inputClass} font-mono text-sm`}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <Copy className="w-4 h-4" />
                {copied === 'url' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Verify Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={facebookConfig.verifyToken}
                readOnly
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(facebookConfig.verifyToken, 'token')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <Copy className="w-4 h-4" />
                {copied === 'token' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">Environment Variables</h4>
            <p className="text-sm text-gray-400 mb-2">Add these to your Railway environment variables:</p>
            <div className="bg-[#0D1117] border border-gray-800 text-green-400 p-3 rounded font-mono text-xs space-y-1">
              <div>FACEBOOK_PAGE_ACCESS_TOKEN={"<your token>"}</div>
              <div>FACEBOOK_VERIFY_TOKEN={facebookConfig.verifyToken || "<your verify token>"}</div>
              <div>FACEBOOK_APP_SECRET={"<your app secret>"}</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "AI Configuration",
      content: (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Response Style</label>
            <select
              value={facebookConfig.responseStyle}
              onChange={(e) => setFacebookConfig({...facebookConfig, responseStyle: e.target.value})}
              className={inputClass}
            >
              <option value="helpful">Helpful & Detailed</option>
              <option value="concise">Concise & Direct</option>
              <option value="conversational">Conversational & Engaging</option>
              <option value="professional">Professional & Formal</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#0D1117] border border-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="hotLeads"
              checked={facebookConfig.enableHotLeadAlerts}
              onChange={(e) => setFacebookConfig({...facebookConfig, enableHotLeadAlerts: e.target.checked})}
              className="w-4 h-4 accent-violet-500"
            />
            <label htmlFor="hotLeads" className="text-sm text-gray-300 cursor-pointer">Enable hot lead detection and alerts</label>
          </div>

          <div className="p-4 bg-[#161B22] border border-gray-800 rounded-lg">
            <h4 className="font-semibold text-white mb-3">AI Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Business</span>
                <span className="text-gray-300">{facebookConfig.businessName || 'Your Business'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Personality</span>
                <span className="text-gray-300 capitalize">{facebookConfig.personality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Welcome</span>
                <span className="text-gray-300 truncate ml-4 max-w-[200px]">{facebookConfig.welcomeMessage || 'Standard welcome message'}</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const validateCurrentStep = () => {
    switch(currentStep) {
      case 0: return facebookConfig.businessName.trim() !== '';
      case 1: return facebookConfig.pageAccessToken.trim() !== '' &&
                     facebookConfig.verifyToken.trim() !== '' &&
                     facebookConfig.appSecret.trim() !== '';
      default: return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) { setError('Please fill in all required fields'); return; }
    setError('');
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const handleCompleteSetup = async () => {
    if (!validateCurrentStep()) return;
    try {
      setIsLoading(true);
      setError('');
      const configResponse = await fetch('/api/facebook/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: facebookConfig })
      });
      const configData = await configResponse.json();
      if (!configData.success) throw new Error(configData.error || 'Failed to configure Facebook AI');
      setSetupComplete(true);
    } catch (error) {
      setError(error.message || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#161B22] rounded-xl border border-gray-800 p-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Facebook Messenger AI Ready!</h1>
            <p className="text-gray-400 mb-8">Your AI is now configured and responding to messages.</p>

            <div className="bg-[#0D1117] border border-gray-800 rounded-lg p-6 mb-8 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform</span>
                <span className="text-gray-200">Facebook Messenger</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Business</span>
                <span className="text-gray-200">{facebookConfig.businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">AI Personality</span>
                <span className="text-gray-200 capitalize">{facebookConfig.personality}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hot Lead Alerts</span>
                <span className={facebookConfig.enableHotLeadAlerts ? 'text-green-400' : 'text-gray-500'}>
                  {facebookConfig.enableHotLeadAlerts ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
          <Facebook className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Facebook Messenger Setup</h1>
          <p className="text-sm text-gray-500">Configure AI-powered responses for Facebook Messenger</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                index < currentStep
                  ? 'bg-violet-600 text-white'
                  : index === currentStep
                  ? 'bg-violet-500/20 border border-violet-500 text-violet-400'
                  : 'bg-gray-800 text-gray-600'
              }`}>
                {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${index < currentStep ? 'bg-violet-600' : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <span key={index} className={`text-xs ${index === currentStep ? 'text-violet-400' : 'text-gray-600'}`}>
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">{steps[currentStep].title}</h2>
        {steps[currentStep].content}

        {error && (
          <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-5 py-2.5 bg-[#161B22] border border-gray-800 text-gray-400 rounded-lg hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Back
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleCompleteSetup}
            disabled={isLoading}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium text-sm"
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
