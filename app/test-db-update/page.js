'use client';

import { useState } from 'react';

export default function TestDbUpdate() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/update-database', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🔧 Database Update</h1>
        
        <p className="text-gray-600 mb-6">
          This will add missing columns to your email_settings table to fix the AI settings save error.
        </p>

        <button
          onClick={runUpdate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-6"
        >
          {loading ? 'Updating Database...' : '🚀 Run Database Update'}
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-medium mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Update Successful!' : '❌ Update Failed'}
            </h3>
            <pre className="text-sm text-gray-600 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>After successful update:</strong> Delete this test page and try saving your AI settings again!
          </p>
        </div>
      </div>
    </div>
  );
}
