'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle, RefreshCw, Settings, ExternalLink } from 'lucide-react';

export default function EmailSetup() {
  const router = useRouter();
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    handleOAuthCallback();
    checkGmailConnection();
  }, []);

  const handleOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    const email = params.get('email');

    if (error) {
      const messages = {
        oauth_denied: 'Gmail access was denied. Please try again and grant the requested permissions.',
        oauth_failed: 'Gmail connection failed. Please try again.',
        user_not_found: 'User account not found. Please contact support.'
      };
      setMessage({ type: 'error', text: messages[error] || 'Failed to connect Gmail.' });
    } else if (success === 'gmail_connected' && email) {
      setMessage({ type: 'success', text: `Gmail connected — ${decodeURIComponent(email)}` });
      setGmailStatus({ connected: true, email: decodeURIComponent(email) });
    }

    if (error || success) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const checkGmailConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', { method: 'POST' });
      const data = await res.json();
      if (data.success) setGmailStatus({ connected: data.connected, email: data.email });
    } catch {}
    setLoading(false);
  };

  const connectGmail = async () => {
    if (gmailStatus.connected) {
      const ok = confirm(`Gmail is connected to ${gmailStatus.email}.\n\nDisconnect and reconnect a different account?`);
      if (!ok) return;
    }
    setConnecting(true);
    window.location.href = '/api/auth/google';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
          <Mail className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Gmail</h1>
          <p className="text-sm text-gray-500">Your AI will read and reply to emails automatically from your Gmail inbox</p>
        </div>
      </div>

      {/* Status message */}
      {message.text && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          }
          <span className="text-sm">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>
      )}

      {/* Connection card */}
      <div className={`bg-[#161B22] border rounded-2xl p-6 ${
        gmailStatus.connected ? 'border-green-500/30' : 'border-gray-800'
      }`}>
        {gmailStatus.connected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Gmail connected</p>
                <p className="text-sm text-gray-400">{gmailStatus.email}</p>
              </div>
            </div>

            <div className="bg-[#0D1117] border border-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                AI is reading new emails and replying automatically
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Lead scoring active on every inbound email
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Automated follow-ups running in the background
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/ai-settings')}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
              >
                <Settings className="w-4 h-4" /> Customize AI behavior
              </button>
              <button
                onClick={connectGmail}
                className="px-4 py-2.5 bg-[#0D1117] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm"
              >
                Reconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <h3 className="font-semibold text-white">How it works</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-violet-400 font-bold mt-0.5">1.</span>
                  Click "Connect Gmail" below and sign in with Google
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-violet-400 font-bold mt-0.5">2.</span>
                  Grant BizzyBot permission to read and send emails on your behalf
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-violet-400 font-bold mt-0.5">3.</span>
                  Your AI starts responding to leads immediately — using the settings from your onboarding
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
              BizzyBot only reads emails from leads — it never accesses personal emails, contacts, or calendar. You can disconnect at any time.
            </div>

            <button
              onClick={connectGmail}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {connecting ? 'Redirecting to Google...' : 'Connect Gmail'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          AI tone and behavior are managed in{' '}
          <button onClick={() => router.push('/ai-settings')} className="text-violet-400 hover:underline">AI Settings</button>
        </span>
        <a href="https://support.google.com/accounts/answer/3466521" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-gray-400">
          Google permissions <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
