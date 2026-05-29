'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Copy, ExternalLink, Instagram, ArrowRight, Settings } from 'lucide-react';

export default function InstagramSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [accessToken, setAccessToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bizzybotai.com'}/api/instagram/webhook`;
  const verifyToken = process.env.NEXT_PUBLIC_INSTAGRAM_VERIFY_TOKEN || 'bizzybot-ig-verify';

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const inputClass = "w-full px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500 transition-colors text-sm font-mono";

  const handleSave = async () => {
    if (!accessToken.trim() || !pageId.trim()) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/instagram/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, pageId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Instagram connected</h2>
          <p className="text-gray-400 text-sm mb-8">Your AI is now responding to Instagram DMs. Tone, personality and behavior are controlled from AI Settings.</p>
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
        <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-center justify-center">
          <Instagram className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Instagram DMs</h1>
          <p className="text-sm text-gray-500">Your AI will respond to Instagram direct messages automatically</p>
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
              {n === 1 ? 'Webhook setup' : 'Instagram credentials'}
            </span>
            {n < 2 && <ArrowRight className="w-4 h-4 text-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Webhook */}
      {step === 1 && (
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2 text-sm">Requirements</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Instagram Business Account (not personal)</li>
              <li>• Facebook Page connected to your Instagram</li>
              <li>• Meta Developer App with Instagram messaging enabled</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="font-semibold text-yellow-400 mb-2 text-sm">In your Meta Developer Console → Webhooks</h4>
            <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>Go to your app → Webhooks → Add Callback URL</li>
              <li>Paste the Callback URL and Verify Token below</li>
              <li>Subscribe to: <strong>messages</strong>, <strong>comments</strong>, messaging_postbacks</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Callback URL</label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-green-400 text-sm font-mono truncate">
                  {webhookUrl}
                </code>
                <button onClick={() => copy(webhookUrl, 'url')} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap">
                  <Copy className="w-4 h-4" />{copied === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Verify Token</label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-green-400 text-sm font-mono">
                  {verifyToken}
                </code>
                <button onClick={() => copy(verifyToken, 'token')} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap">
                  <Copy className="w-4 h-4" />{copied === 'token' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm">
            I've set up the webhook — continue
          </button>
        </div>
      )}

      {/* Step 2: Credentials */}
      {step === 2 && (
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2 text-sm">Where to find these</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong className="text-gray-200">Access Token:</strong> Meta Developer Console → Your App → Instagram Basic Display → Generate Token</li>
              <li>• <strong className="text-gray-200">Page ID:</strong> Meta Business Manager → Instagram Accounts → click your account → copy Page ID</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Instagram Page Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="Enter your Instagram Page Access Token"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Instagram Page ID</label>
              <input
                type="text"
                value={pageId}
                onChange={e => setPageId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-white rounded-lg text-sm">
              Back
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium text-sm">
              {loading ? 'Connecting...' : 'Connect Instagram'}
            </button>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')} className="flex items-center gap-3 p-4 bg-[#161B22] border border-gray-800 rounded-xl text-left hover:border-gray-600 transition-colors">
          <ExternalLink className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div>
            <div className="font-medium text-white text-sm">Meta Developer Console</div>
            <div className="text-xs text-gray-500">Configure your Instagram app</div>
          </div>
        </button>
        <button onClick={() => window.open('https://business.facebook.com/', '_blank')} className="flex items-center gap-3 p-4 bg-[#161B22] border border-gray-800 rounded-xl text-left hover:border-gray-600 transition-colors">
          <ExternalLink className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div>
            <div className="font-medium text-white text-sm">Meta Business Manager</div>
            <div className="text-xs text-gray-500">Manage your Instagram page</div>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        AI tone, personality and behavior are managed in{' '}
        <button onClick={() => router.push('/ai-settings')} className="text-violet-400 hover:underline">AI Settings</button>
        {' '}— no need to configure them here.
      </p>
    </div>
  );
}
