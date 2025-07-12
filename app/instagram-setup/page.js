// app/instagram-setup/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, Copy, ExternalLink, Camera } from 'lucide-react';

export default function InstagramSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    accessToken: '',
    pageId: '',
    businessName: '',
    welcomeMessage: 'Hi! Thanks for messaging us on Instagram. How can we help you today?',
    personality: 'friendly',
    aiModel: 'gpt-4o-mini'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bizzybotai.com'}/api/instagram/webhook`;
  const verifyToken = 'verify_bizzy_bot_ai';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!config.accessToken || !config.pageId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/instagram/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Instagram AI Assistant configured successfully! 🎉');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to configure Instagram integration');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupSteps = [
    {
      title: "Meta Developer Setup",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📱 Instagram Setup Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Instagram Business Account (not personal)</li>
              <li>• Facebook Page connected to Instagram</li>
              <li>• Meta Developer App with Instagram Basic Display</li>
              <li>• Valid SSL certificate (https://)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Step 1: Configure Instagram Webhook</h4>
            <p className="text-sm text-gray-600">
              In your Meta Developer Console, add these webhook settings for Instagram:
            </p>
            
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Callback URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border rounded px-2 py-1 text-sm">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">Verify Token</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border rounded px-2 py-1 text-sm">
                      {verifyToken}
                    </code>
                    <button
                      onClick={() => copyToClipboard(verifyToken)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Subscribe to <strong>messages</strong> and <strong>messaging_postbacks</strong> webhook fields
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Access Token & Page ID",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram Page Access Token *
              </label>
              <input
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig(prev => ({...prev, accessToken: e.target.value}))}
                placeholder="Enter your Instagram Page Access Token"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from Meta Developer Console → Instagram Basic Display → Generate Token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram Page ID *
              </label>
              <input
                type="text"
                value={config.pageId}
                onChange={(e) => setConfig(prev => ({...prev, pageId: e.target.value}))}
                placeholder="Enter your Instagram Page ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Meta Business Manager → Instagram Accounts → Page ID
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-semibold text-green-800 mb-2">🔍 How to Find Your Info:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Access Token:</strong> Meta Developer Console → Your App → Instagram Basic Display → Generate Token</li>
              <li>• <strong>Page ID:</strong> Meta Business Manager → Instagram Accounts → Click your page → Copy Page ID</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "AI Configuration",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={config.businessName}
              onChange={(e) => setConfig(prev => ({...prev, businessName: e.target.value}))}
              placeholder="Your Business Name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Welcome Message
            </label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig(prev => ({...prev, welcomeMessage: e.target.value}))}
              placeholder="Hi! Thanks for messaging us on Instagram..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Personality
            </label>
            <select
              value={config.personality}
              onChange={(e) => setConfig(prev => ({...prev, personality: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="friendly">Friendly & Casual</option>
              <option value="professional">Professional & Formal</option>
              <option value="enthusiastic">Enthusiastic & Energetic</option>
              <option value="helpful">Helpful & Supportive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Model
            </label>
            <select
              value={config.aiModel}
              onChange={(e) => setConfig(prev => ({...prev, aiModel: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
              <option value="gpt-4o">GPT-4o (Advanced)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
            </select>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white hover:text-gray-300 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <Camera className="w-8 h-8 text-purple-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-white">Instagram AI Setup</h1>
              <p className="text-gray-300">Connect your Instagram account for AI-powered direct messages</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Progress Steps */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                {setupSteps.map((s, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step > index + 1 ? 'bg-green-500 text-white' :
                      step === index + 1 ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step > index + 1 ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    {index < setupSteps.length - 1 && (
                      <div className={`w-16 h-1 mx-2 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-gray-800">{setupSteps[step - 1].title}</h3>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6">
              {setupSteps[step - 1].content}

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {copied && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">✅ Copied to clipboard!</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex gap-3">
                {step < setupSteps.length ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={loading || !config.accessToken || !config.pageId}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Configuring...' : 'Complete Setup'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              <div>
                <div className="font-semibold">Meta Developer Console</div>
                <div className="text-sm text-gray-300">Configure your Instagram app</div>
              </div>
            </a>

            
              href="https://business.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              <div>
                <div className="font-semibold">Meta Business Manager</div>
                <div className="text-sm text-gray-300">Manage your Instagram page</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
