'use client';

import { useState } from 'react';

export default function FixDatabasePage() {
  const [status, setStatus] = useState('ready');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDatabaseFix = async () => {
    setLoading(true);
    setStatus('running');
    setError(null);
    setResult(null);

    try {
      console.log('🔧 Starting database fix...');
      
      const response = await fetch('/api/admin/fix-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/fix-database', {
        method: 'GET'
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔧 Database Fix Utility
        </h1>
        <p className="text-gray-600 mb-8">
          Fix the "detected_at column does not exist" error and update your database schema
        </p>
        
        {/* Status Banner */}
        <div className={`p-4 rounded-lg mb-6 ${
          status === 'success' ? 'bg-green-50 border border-green-200' :
          status === 'error' ? 'bg-red-50 border border-red-200' :
          status === 'running' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <h2 className={`font-semibold text-lg ${
            status === 'success' ? 'text-green-800' :
            status === 'error' ? 'text-red-800' :
            status === 'running' ? 'text-yellow-800' :
            'text-blue-800'
          }`}>
            {status === 'ready' && '⏳ Ready to fix database'}
            {status === 'running' && '🔄 Running database fix...'}
            {status === 'success' && '✅ Database fix completed successfully!'}
            {status === 'error' && '❌ Error occurred during fix'}
          </h2>
          {status === 'running' && (
            <p className="text-yellow-700 mt-2">
              Please wait while we update your database schema...
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={runDatabaseFix}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Fixing Database...
              </>
            ) : (
              <>
                🔧 Run Database Fix
              </>
            )}
          </button>
          
          <button 
            onClick={checkDatabaseStatus}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            📊 Check Status
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold text-lg mb-3">❌ Error Details:</h3>
            <div className="bg-white rounded border p-4">
              <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-auto">
                {error}
              </pre>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className={`rounded-lg p-6 mb-6 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold text-lg mb-4 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ Fix Results:' : '❌ Error Details:'}
            </h3>
            
            {/* Key Information */}
            {result.success && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded border p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Database Status</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✅ Database Connected: {result.database_connected ? 'Yes' : 'No'}</li>
                    <li>✅ Hot Leads Table: {result.hot_leads_detected_at_exists ? 'Fixed' : 'Needs Fix'}</li>
                    <li>✅ Tables Found: {result.tables?.length || 0}</li>
                  </ul>
                </div>
                
                {result.steps_completed && (
                  <div className="bg-white rounded border p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Completed Steps</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {result.steps_completed.map((step, index) => (
                        <li key={index}>✅ {step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Full JSON Response */}
            <details className="bg-white rounded border">
              <summary className="p-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50">
                📋 View Full Response Details
              </summary>
              <div className="border-t p-4">
                <pre className="text-sm text-gray-600 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-yellow-800 font-semibold text-lg mb-3">📋 How to Use:</h3>
          <ol className="text-yellow-800 space-y-2">
            <li><strong>1. Click "Run Database Fix"</strong> to apply schema updates</li>
            <li><strong>2. Wait for completion</strong> (usually 30-60 seconds)</li>
            <li><strong>3. Look for "hot_leads_detected_at_exists": true</strong> in results</li>
            <li><strong>4. Go back to dashboard</strong> to verify the error is gone</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-100 rounded border">
            <p className="text-yellow-800 text-sm">
              <strong>What this fixes:</strong> Adds missing columns (detected_at, clerk_user_id, business_name) 
              and ensures your database schema matches the latest code requirements.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <a 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            ← Back to Dashboard
          </a>
          
          {status === 'success' && (
            <a 
              href="/dashboard" 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              🎉 Test Dashboard Now
            </a>
          )}
        </div>
        
        {/* Technical Info */}
        <div className="mt-8 pt-6 border-t text-sm text-gray-500">
          <p>
            <strong>Target Issues:</strong> "detected_at column does not exist", "user_id column does not exist", 
            "Failed to load dashboard data"
          </p>
          <p className="mt-1">
            <strong>Safe Operation:</strong> Uses "ADD COLUMN IF NOT EXISTS" - won't damage existing data
          </p>
        </div>
      </div>
    </div>
  );
}
