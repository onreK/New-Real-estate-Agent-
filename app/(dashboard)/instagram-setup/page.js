// app/(dashboard)/instagram-setup/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Copy, ExternalLink, Instagram } from 'lucide-react';

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
  const [copied, setCopied] = useState('');

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bizzybotai.com'}/api/instagram/webhook`;
  const verifyToken = 'verify_bizzy_bot_ai';

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
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
        setSuccess('Instagram AI configured successfully!');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to configure Instagram integration');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors text-sm";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  const stepLabels = ['Webhook Setup', 'Access Token', 'AI Config'];

  return (
    <div className="p-8 space-y-6">

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-center justify-center">
          <Instagram className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Instagram AI Setup</h1>
          <p className="text-sm text-gray-500">Connect your Instagram account for AI-powered direct messages</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((stepNumber, index) => (
            <div key={stepNumber} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                step > stepNumber
                  ? 'bg-violet-600 text-white'
                  : step === stepNumber
                  ? 'bg-violet-500/20 border border-violet-500 text-violet-400'
                  : 'bg-gray-800 text-gray-600'
              }`}>
                {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
              </div>
              {index < 2 && (
                <div className={`flex-1 h-px mx-2 ${step > stepNumber ? 'bg-violet-600' : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {stepLabels.map((label, index) => (
            <span key={index} className={`text-xs ${index + 1 === step ? 'text-violet-400' : 'text-gray-600'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#161B22] border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">
          {step === 1 && 'Webhook Setup'}
          {step === 2 && 'Access Token & Page ID'}
          {step === 3 && 'AI Configuration'}
        </h2>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-semibold text-blue-400 mb-2">Instagram Setup Requirements</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Instagram Business Account (not personal)</li>
                <li>• Facebook Page connected to Instagram</li>
                <li>• Meta Developer App with Instagram Basic Display</li>
                <li>• Valid SSL certificate (https://)</li>
              </ul>
            </div>

            <p className="text-sm text-gray-400">In your Meta Developer Console, add these webhook settings for Instagram:</p>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Callback URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-green-400 text-sm font-mono truncate">
                    {webhookUrl}
                  </code>
                  <button
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
                  <code className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-green-400 text-sm font-mono">
                    {verifyToken}
                  </code>
                  <button
                    onClick={() => copyToClipboard(verifyToken, 'token')}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Copy className="w-4 h-4" />
                    {copied === 'token' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-300">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Subscribe to <strong>messages</strong> and <strong>messaging_postbacks</strong> webhook fields
              </p>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Instagram Page Access Token *</label>
              <input
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig(prev => ({...prev, accessToken: e.target.value}))}
                placeholder="Enter your Instagram Page Access Token"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from Meta Developer Console → Instagram Basic Display → Generate Token
              </p>
            </div>

            <div>
              <label className={labelClass}>Instagram Page ID *</label>
              <input
                type="text"
                value={config.pageId}
                onChange={(e) => setConfig(prev => ({...prev, pageId: e.target.value}))}
                placeholder="Enter your Instagram Page ID"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Meta Business Manager → Instagram Accounts → Page ID
              </p>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="font-semibold text-green-400 mb-2">How to Find Your Info</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• <strong className="text-gray-200">Access Token:</strong> Meta Developer Console → Your App → Instagram Basic Display → Generate Token</li>
                <li>• <strong className="text-gray-200">Page ID:</strong> Meta Business Manager → Instagram Accounts → Click your page → Copy Page ID</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Business Name</label>
              <input
                type="text"
                value={config.businessName}
                onChange={(e) => setConfig(prev => ({...prev, businessName: e.target.value}))}
                placeholder="Your Business Name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Welcome Message</label>
              <textarea
                value={config.welcomeMessage}
                onChange={(e) => setConfig(prev => ({...prev, welcomeMessage: e.target.value}))}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>AI Personality</label>
              <select
                value={config.personality}
                onChange={(e) => setConfig(prev => ({...prev, personality: e.target.value}))}
                className={inputClass}
              >
                <option value="friendly">Friendly & Casual</option>
                <option value="professional">Professional & Formal</option>
                <option value="enthusiastic">Enthusiastic & Energetic</option>
                <option value="helpful">Helpful & Supportive</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>AI Model</label>
              <select
                value={config.aiModel}
                onChange={(e) => setConfig(prev => ({...prev, aiModel: e.target.value}))}
                className={inputClass}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                <option value="gpt-4o">GPT-4o (Advanced)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
              </select>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-5 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-400 text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-5 py-2.5 bg-[#161B22] border border-gray-800 text-gray-400 rounded-lg hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Previous
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={loading || !config.accessToken || !config.pageId}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
          >
            {loading ? 'Configuring...' : 'Complete Setup'}
          </button>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
          className="flex items-center gap-3 p-4 bg-[#161B22] border border-gray-800 rounded-xl text-left hover:border-gray-600 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div>
            <div className="font-medium text-white text-sm">Meta Developer Console</div>
            <div className="text-xs text-gray-500">Configure your Instagram app</div>
          </div>
        </button>

        <button
          onClick={() => window.open('https://business.facebook.com/', '_blank')}
          className="flex items-center gap-3 p-4 bg-[#161B22] border border-gray-800 rounded-xl text-left hover:border-gray-600 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div>
            <div className="font-medium text-white text-sm">Meta Business Manager</div>
            <div className="text-xs text-gray-500">Manage your Instagram page</div>
          </div>
        </button>
      </div>
    </div>
  );
}
