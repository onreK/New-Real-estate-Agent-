'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Copy, ExternalLink, Facebook, ArrowRight, Settings } from 'lucide-react';

export default function FacebookSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/facebook/webhook`);
    }
    // Use a stable verify token derived from env — customers just copy it, don't invent one
    setVerifyToken(process.env.NEXT_PUBLIC_FACEBOOK_VERIFY_TOKEN || 'bizzybot-fb-verify');
  }, []);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const inputClass = "w-full px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors font-mono text-sm";

  const handleSave = async () => {
    if (!pageAccessToken.trim() || !appSecret.trim()) {
      setError('Both fields are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/facebook/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { pageAccessToken, appSecret, verifyToken } })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save credentials');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Facebook Messenger connected</h2>
          <p className="text-gray-400 text-sm mb-8">Your AI is now responding to messages on Facebook. Tone, personality and behavior are controlled from AI Settings.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push('/ai-settings')} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium">
              <Settings className="w-4 h-4" /> Customize AI behavior
            </button>
            <button onClick={() => router.push('/dashboard')} className="px-5 py-2.5 bg-[#0D1117] border border-gray-800 hover:border-gray-600 text-gray-300 rounded-lg text-sm">
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
          <Facebook className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Facebook Messenger</h1>
          <p className="text-sm text-gray-500">Your AI will respond to messages on your Facebook Page automatically</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3">
        {[1, 2].map(n => (
          <div key={n} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              n < step ? 'bg-violet-600 text-white' :
              n === step ? 'bg-violet-500/20 border border-violet-500 text-violet-400' :
              'bg-gray-800 text-gray-600'
            }`}>
              {n < step ? <CheckCircle className="w-4 h-4" /> : n}
            </div>
            <span className={`text-sm ${n === step ? 'text-white' : 'text-gray-600'}`}>
              {n === 1 ? 'Facebook credentials' : 'Webhook setup'}
            </span>
            {n < 2 && <ArrowRight className="w-4 h-4 text-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Credentials */}
      {step === 1 && (
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2 text-sm">Where to find these</h4>
            <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="w-3 h-3" /></a></li>
              <li>Select your app → Add "Messenger" product if not added</li>
              <li>Messenger → Settings → Access Tokens → generate token for your Page</li>
              <li>App Settings → Basic → copy App Secret</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Page Access Token</label>
              <input
                type="password"
                value={pageAccessToken}
                onChange={e => setPageAccessToken(e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxxx..."
                className={inputClass}
              />
              <p className="text-xs text-gray-600 mt-1">Messenger Settings → Access Tokens</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">App Secret</label>
              <input
                type="password"
                value={appSecret}
                onChange={e => setAppSecret(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={inputClass}
              />
              <p className="text-xs text-gray-600 mt-1">App Settings → Basic → App Secret</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 text-white rounded-lg font-medium text-sm"
          >
            {saving ? 'Saving...' : 'Save & continue'}
          </button>
        </div>
      )}

      {/* Step 2: Webhook */}
      {step === 2 && (
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="font-semibold text-yellow-400 mb-2 text-sm">Set up your webhook in Facebook</h4>
            <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>In your Facebook app, go to Messenger → Settings → Webhooks</li>
              <li>Click "Add Callback URL"</li>
              <li>Paste the Callback URL and Verify Token below</li>
              <li>Subscribe to: <strong>messages</strong>, <strong>feed</strong>, messaging_postbacks</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Callback URL</label>
              <div className="flex gap-2">
                <input type="text" value={webhookUrl} readOnly className={`${inputClass} flex-1`} />
                <button onClick={() => copy(webhookUrl, 'url')} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap">
                  <Copy className="w-4 h-4" />{copied === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Verify Token</label>
              <div className="flex gap-2">
                <input type="text" value={verifyToken} readOnly className={`${inputClass} flex-1`} />
                <button onClick={() => copy(verifyToken, 'token')} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap">
                  <Copy className="w-4 h-4" />{copied === 'token' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm">
              Back
            </button>
            <button onClick={() => setDone(true)} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm">
              I've set up the webhook — finish
            </button>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-600 text-center">
        AI tone, personality and behavior are managed in{' '}
        <button onClick={() => router.push('/ai-settings')} className="text-violet-400 hover:underline">AI Settings</button>
        {' '}— no need to configure them here.
      </p>
    </div>
  );
}
