'use client';

import { useState } from 'react';

export default function DebugIssues() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('check');

  const runDebugTests = async () => {
    setLoading(true);
    const debugResults = {};

    // Step 1: Test if migration API works
    try {
      console.log('Testing migration API...');
      const response = await fetch('/api/admin/migrate-database', {
        method: 'POST'
      });
      const data = await response.json();
      debugResults.migration = {
        success: response.ok,
        data: data,
        message: response.ok ? 'Migration API works' : 'Migration API failed'
      };
    } catch (error) {
      debugResults.migration = {
        success: false,
        message: `Migration API error: ${error.message}`
      };
    }

    // Step 2: Test basic database connection
    try {
      console.log('Testing database connection...');
      const response = await fetch('/api/admin/test-db-connection');
      const data = await response.json();
      debugResults.dbConnection = {
        success: response.ok,
        data: data,
        message: response.ok ? 'Database connected' : 'Database connection failed'
      };
    } catch (error) {
      debugResults.dbConnection = {
        success: false,
        message: `Database connection error: ${error.message}`
      };
    }

    // Step 3: Test user authentication
    try {
      console.log('Testing user authentication...');
      const response = await fetch('/api/auth/test-user');
      const data = await response.json();
      debugResults.userAuth = {
        success: response.ok,
        data: data,
        message: response.ok ? `User authenticated: ${data.userId}` : 'User not authenticated'
      };
    } catch (error) {
      debugResults.userAuth = {
        success: false,
        message: `User auth error: ${error.message}`
      };
    }

    // Step 4: Test dashboard with detailed error info
    try {
      console.log('Testing dashboard API with details...');
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      debugResults.dashboard = {
        success: response.ok && data.success,
        data: data,
        message: response.ok ? 'Dashboard API works' : `Dashboard failed: ${data.error || data.details}`,
        statusCode: response.status
      };
    } catch (error) {
      debugResults.dashboard = {
        success: false,
        message: `Dashboard error: ${error.message}`
      };
    }

    setResults(debugResults);
    setLoading(false);
  };

  const runMigrationOnly = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migrate-database', {
        method: 'POST'
      });
      const data = await response.json();
      setResults({
        migration: {
          success: response.ok,
          data: data,
          message: response.ok ? 'Migration completed successfully!' : 'Migration failed'
        }
      });
      if (response.ok) {
        setStep('test');
      }
    } catch (error) {
      setResults({
        migration: {
          success: false,
          message: `Migration error: ${error.message}`
        }
      });
    }
    setLoading(false);
  };

  const createTestCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-test-customer', {
        method: 'POST'
      });
      const data = await response.json();
      setResults({
        ...results,
        testCustomer: {
          success: response.ok,
          data: data,
          message: response.ok ? 'Test customer created!' : 'Failed to create test customer'
        }
      });
    } catch (error) {
      setResults({
        ...results,
        testCustomer: {
          success: false,
          message: `Test customer error: ${error.message}`
        }
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔍 Debug Database Issues
            </h1>
            <p className="text-gray-600">
              Let's find out exactly what's causing the API failures
            </p>
          </div>

          {step === 'check' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Step 1: Run Migration First</h2>
                <p className="text-gray-600 mb-6">
                  Let's run the database migration to fix schema issues
                </p>
                <button
                  onClick={runMigrationOnly}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium"
                >
                  {loading ? '🔄 Running Migration...' : '🗄️ Run Database Migration'}
                </button>
              </div>

              {results.migration && (
                <div className={`p-4 rounded-lg ${
                  results.migration.success 
                    ? 'bg-green-100 border border-green-200' 
                    : 'bg-red-100 border border-red-200'
                }`}>
                  <h3 className={`font-medium mb-2 ${
                    results.migration.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Migration Result
                  </h3>
                  <p className="text-sm text-gray-700 mb-2">{results.migration.message}</p>
                  {results.migration.data && (
                    <details className="text-xs text-gray-600">
                      <summary>View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(results.migration.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'test' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Step 2: Run Detailed Debug Tests</h2>
                <p className="text-gray-600 mb-6">
                  Now let's test all the APIs and see what's failing
                </p>
                <button
                  onClick={runDebugTests}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium"
                >
                  {loading ? '🔄 Running Debug Tests...' : '🧪 Run Debug Tests'}
                </button>
              </div>

              {Object.keys(results).length > 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Debug Results:</h3>
                  {Object.entries(results).map(([key, result]) => (
                    <div key={key} className={`p-4 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <span className={`px-2 py-1 rounded text-sm ${
                          result.success 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {result.success ? '✅ PASS' : '❌ FAIL'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                      {result.data && (
                        <details className="text-xs text-gray-500">
                          <summary>View Raw Data</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">If Customer Not Found:</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      The "Customer not found" error means you don't have a customer record yet. 
                      Let's create one:
                    </p>
                    <button
                      onClick={createTestCustomer}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                    >
                      {loading ? '🔄 Creating...' : '👤 Create Test Customer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">💡 What We're Testing:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Database migration completion</li>
              <li>Database connection and table existence</li>
              <li>User authentication (Clerk integration)</li>
              <li>Customer record creation/retrieval</li>
              <li>API endpoint functionality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
