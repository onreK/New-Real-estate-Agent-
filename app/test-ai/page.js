'use client';

import { useState } from 'react';

export default function TestAIPage() {
  const [testMessage, setTestMessage] = useState('Hello, are you connected to OpenAI?');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const testConnection = async () => {
    setIsLoading(true);
    setResponse('');
    setConnectionStatus(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage,
          conversationHistory: []
        })
      });

      const data = await res.json();
      setResponse(data.response);
      
      if (data.isAI) {
        setConnectionStatus({
          status: 'connected',
          model: data.model,
          usage: data.usage
        });
      } else {
        setConnectionStatus({
          status: 'disconnected',
          error: data.error || 'No AI connection'
        });
      }
    } catch (error) {
      setResponse(`Connection Error: ${error.message}`);
      setConnectionStatus({
        status: 'error',
        error: error.message
      });
    }
    
    setIsLoading(false);
  };

  const getStatusColor = () => {
    if (!connectionStatus) return 'bg-gray-100';
    switch (connectionStatus.status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    if (!connectionStatus) return '🔄';
    switch (connectionStatus.status) {
      case 'connected': return '✅';
      case 'disconnected': return '⚠️';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 AI Connection Test</h1>
        
        {/* Connection Status */}
        {connectionStatus && (
          <div className={`p-4 rounded-lg mb-6 ${getStatusColor()}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStatusIcon()}</span>
              <div>
                <div className="font-semibold">
                  {connectionStatus.status === 'connected' && 'OpenAI Connected Successfully!'}
                  {connectionStatus.status === 'disconnected' && 'OpenAI Not Connected (Fallback Mode)'}
                  {connectionStatus.status === 'error' && 'Connection Error'}
                </div>
                {connectionStatus.model && (
                  <div className="text-sm opacity-75">Model: {connectionStatus.model}</div>
                )}
                {connectionStatus.usage && (
                  <div className="text-sm opacity-75">
                    Tokens: {connectionStatus.usage.total_tokens} 
                    (Prompt: {connectionStatus.usage.prompt_tokens}, 
                    Completion: {connectionStatus.usage.completion_tokens})
                  </div>
                )}
                {connectionStatus.error && (
                  <div className="text-sm opacity-75">Error: {connectionStatus.error}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Message</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a test message..."
            />
          </div>

          <button
            onClick={testConnection}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Testing Connection...' : '🚀 Test AI Connection'}
          </button>
        </div>

        {/* Response */}
        {response && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        )}

        {/* Troubleshooting Guide */}
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Troubleshooting Guide</h2>
          
          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">✅ If Connected (Green)</h3>
              <p className="text-blue-700">Great! Your AI is working. Check the model and usage stats above.</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800">⚠️ If Disconnected (Yellow)</h3>
              <ul className="text-yellow-700 list-disc list-inside space-y-1">
                <li>Check if OPENAI_API_KEY is set in Vercel environment variables</li>
                <li>Verify your API key starts with 'sk-'</li>
                <li>Redeploy after adding the API key</li>
              </ul>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800">❌ If Error (Red)</h3>
              <ul className="text-red-700 list-disc list-inside space-y-1">
                <li><strong>Invalid API Key:</strong> Double-check your OpenAI API key</li>
                <li><strong>Quota Exceeded:</strong> Check your OpenAI billing/usage</li>
                <li><strong>Network Error:</strong> Check your internet connection</li>
                <li><strong>Server Error:</strong> Check browser console for details</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
