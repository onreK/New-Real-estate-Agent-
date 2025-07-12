'use client';

import { useState } from 'react';

export default function TestFixes() {
  const [step, setStep] = useState(1);
  const [migrationResult, setMigrationResult] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migrate-database', {
        method: 'POST'
      });
      const data = await response.json();
      setMigrationResult(data);
      if (data.success) {
        setStep(2);
      }
    } catch (error) {
      setMigrationResult({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const testAPIs = async () => {
    setLoading(true);
    const results = {};

    // Test Dashboard API
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      results.dashboard = {
        success: response.ok && data.success,
        message: response.ok ? 'Dashboard API working!' : (data.error || 'Dashboard API failed'),
        details: data
      };
    } catch (error) {
      results.dashboard = {
        success: false,
        message: `Dashboard API error: ${error.message}`
      };
    }

    // Test Customer Stats API
    try {
      const response = await fetch('/api/customer/stats');
      const data = await response.json();
      results.customerStats = {
        success: response.ok && data.success,
        message: response.ok ? 'Customer Stats API working!' : (data.error || 'Customer Stats API failed'),
        details: data
      };
    } catch (error) {
      results.customerStats = {
        success: false,
        message: `Customer Stats API error: ${error.message}`
      };
    }

    // Test SMS Conversations API
    try {
      const response = await fetch('/api/sms/conversations');
      const data = await response.json();
      results.sms = {
        success: response.ok && data.success,
        message: response.ok ? 'SMS API working!' : (data.error || 'SMS API failed'),
        details: data
      };
    } catch (error) {
      results.sms = {
        success: false,
        message: `SMS API error: ${error.message}`
      };
    }

    setTestResults(results);
    setStep(3);
    setLoading(false);
  };

  const createTestCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-test-customer', {
        method: 'POST'
      });
      const data = await response.json();
      setTestResults({
        ...testResults,
        testCustomer: {
          success: response.ok,
          data: data,
          message: response.ok ? 'Test customer created!' : 'Failed to create test customer'
        }
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        testCustomer: {
          success: false,
          message: `Test customer error: ${error.message}`
        }
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔧 Database Fix & Test
            </h1>
            <p className="text-gray-600">
              Fix your database issues and test all functionality
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Migration</span>
              <span>Testing</span>
              <span>Complete</span>
            </div>
          </div>

          {/* Step 1: Migration */}
          {step === 1 && (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Step 1: Run Database Migration</h2>
              <p className="text-gray-600 mb-6">
                This will fix your database schema and add missing functions.
              </p>
              <button
                onClick={runMigration}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '🔄 Running Migration...' : '🚀 Run Database Migration'}
              </button>

              {migrationResult && (
                <div className={`mt-6 p-4 rounded-lg text-left ${
                  migrationResult.success 
                    ? 'bg-green-100 border border-green-200' 
                    : 'bg-red-100 border border-red-200'
                }`}>
                  <h3 className={`font-medium mb-2 ${
                    migrationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {migrationResult.success ? '✅ Migration Successful!' : '❌ Migration Failed'}
                  </h3>
                  {migrationResult.steps && (
                    <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                      {migrationResult.steps.map((step, index) => (
                        <div key={index} className="text-gray-700">{step}</div>
                      ))}
                    </div>
                  )}
                  {migrationResult.error && (
                    <div className="text-red-700 text-sm mt-2">
                      Error: {migrationResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Testing */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Step 2: Test Database Functions</h2>
              <p className="text-gray-600 mb-6">
                Now let's test that all your APIs are working properly.
              </p>
              <button
                onClick={testAPIs}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '🔄 Testing APIs...' : '🧪 Test All APIs'}
              </button>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-center">✅ Test Results</h2>
              
              <div className="space-y-4 mb-6">
                {Object.entries(testResults).map(([key, result]) => (
                  <div key={key} className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium capitalize">{key} API</h3>
                      <span className={`px-2 py-1 rounded text-sm ${
                        result.success 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {result.success ? '✅ PASS' : '❌ FAIL'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  </div>
                ))}
              </div>

              {/* Create Customer Button if needed */}
              {Object.values(testResults).some(r => !r.success && r.message.includes('Customer not found')) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Customer Not Found Issue:</h3>
                  <p className="text-blue-700 text-sm mb-3">
                    You need a customer record in the database. Let's create one:
                  </p>
                  <button
                    onClick={createTestCustomer}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                  >
                    {loading ? '🔄 Creating...' : '👤 Create Customer Record'}
                  </button>
                </div>
              )}

              {/* Final Status */}
              <div className={`p-6 rounded-lg text-center ${
                Object.values(testResults).every(r => r.success)
                  ? 'bg-green-100 border border-green-200'
                  : 'bg-yellow-100 border border-yellow-200'
              }`}>
                {Object.values(testResults).every(r => r.success) ? (
                  <div>
                    <h3 className="text-green-800 font-bold text-lg mb-2">🎉 All Tests Passed!</h3>
                    <p className="text-green-700 mb-4">
                      Your database is fixed and all APIs are working properly.
                    </p>
                    <div className="text-sm text-green-600">
                      <p>✅ You can now go to your main dashboard</p>
                      <p>✅ All the "getCustomerByClerkId is not a function" errors should be gone</p>
                      <p>✅ The "Failed to load dashboard data" error should be fixed</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-yellow-800 font-bold text-lg mb-2">⚠️ Some Issues Remain</h3>
                    <p className="text-yellow-700 mb-4">
                      Some APIs are still failing. Check the error messages above.
                    </p>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Next Steps:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Go to your main dashboard and check if it loads properly</li>
                  <li>2. Test the OpenAI connection in your settings</li>
                  <li>3. Try creating a conversation to make sure everything works</li>
                  <li>4. Delete this test page once you confirm everything is working</li>
                </ul>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">💡 What This Does:</h3>
            <p className="text-sm text-gray-600">
              This tool runs a database migration to add missing tables and columns, 
              then tests all your API endpoints to make sure they're working properly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
