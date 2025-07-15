'use client';
import { useState } from 'react';

export default function EmailAITest() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [connectedEmail, setConnectedEmail] = useState('kernojunk@gmail.com');

  const checkEmails = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/gmail/monitor', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'check',
          emailAddress: connectedEmail
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails || []);
        setResult(`✅ Found ${data.emails?.length || 0} unread emails`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const sendAIResponse = async (emailId, from, subject) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/gmail/monitor', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'respond',
          emailAddress: connectedEmail,
          emailId: emailId,
          actualSend: true  // This actually sends the email
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.actualSent) {
        setResult(`🎉 AI response sent successfully to ${data.data.sentTo}!`);
        // Refresh emails to show updated status
        setTimeout(() => checkEmails(), 2000);
      } else {
        setResult(`❌ Error sending response: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Email AI Testing Dashboard</h1>
          <p className="text-gray-600">Test your Gmail AI automation system</p>
          
          {/* Connected Email Status */}
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Gmail Connected</h3>
                <div className="mt-1 text-sm text-green-700">
                  <p>Connected to: <strong>{connectedEmail}</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 Email Monitor Controls</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={checkEmails}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Checking...' : '📬 Check for New Emails'}
            </button>
          </div>

          {/* Result Message */}
          {result && (
            <div className={`p-4 rounded-lg ${result.includes('❌') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-sm font-medium ${result.includes('❌') ? 'text-red-800' : 'text-green-800'}`}>
                {result}
              </p>
            </div>
          )}
        </div>

        {/* Email List */}
        {emails.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📨 Unread Emails ({emails.length})</h2>
            
            <div className="space-y-4">
              {emails.map((email) => (
                <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{email.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1">From: {email.from}</p>
                      <p className="text-xs text-gray-500">{email.date}</p>
                    </div>
                    
                    <button
                      onClick={() => sendAIResponse(email.id, email.from, email.subject)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {loading ? '🤖 Sending...' : '🤖 Send AI Response'}
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-700 font-medium mb-1">Email Preview:</p>
                    <p className="text-sm text-gray-600">{email.snippet}</p>
                  </div>
                  
                  {email.body && email.body.length > email.snippet?.length && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">Show full content</summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{email.body}</p>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {emails.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 How to Test</h2>
            <div className="prose text-gray-600">
              <ol className="list-decimal list-inside space-y-2">
                <li>Send an email to <strong>kernojunk@gmail.com</strong> from another email account</li>
                <li>Click "<strong>Check for New Emails</strong>" to find unread emails</li>
                <li>Click "<strong>Send AI Response</strong>" next to any email to generate and send an AI reply</li>
                <li>Check your original email account to see the AI response</li>
              </ol>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900">💡 Demo Tips</h3>
                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                  <li>• Send emails with business inquiries like "What are your rates?" or "When are you available?"</li>
                  <li>• The AI will generate professional responses automatically</li>
                  <li>• Responses include proper business signatures and disclaimers</li>
                  <li>• Original emails are marked as read after AI responds</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
