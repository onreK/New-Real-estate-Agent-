// app/admin/migrate/page.js
// Migration dashboard page - Run and monitor database migration

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function MigrationDashboard() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [error, setError] = useState(null);

  // Check migration status on load
  useEffect(() => {
    if (isLoaded && userId) {
      checkStatus();
    } else if (isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isLoaded, userId]);

  // Check current migration status
  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/migrate-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to check status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run the migration
  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the database migration? This will create new tables and migrate existing data.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setMigrationResult(null);
      
      const response = await fetch('/api/admin/migrate-database', {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMigrationResult(data);
        // Refresh status after migration
        await checkStatus();
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Database Migration Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Upgrade your database to multi-tenant architecture for scaling to 1000+ customers
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Migration Success */}
        {migrationResult && migrationResult.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Migration Successful!</h3>
                <p className="mt-1 text-sm text-green-700">
                  Database has been upgraded to multi-tenant architecture
                </p>
                {migrationResult.summary && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>• Customers: {migrationResult.summary.customers}</p>
                    <p>• Contacts created: {migrationResult.summary.contacts}</p>
                    <p>• Events migrated: {migrationResult.summary.events_linked}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Status */}
        {status && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Migration Status</h2>
            
            <div className="space-y-3">
              <StatusItem 
                label="AI Analytics Events Table" 
                status={status.ai_analytics_events_exists}
                description="Main events tracking table"
              />
              <StatusItem 
                label="Contacts Table" 
                status={status.contacts_table_exists}
                description="Multi-tenant contacts/leads table"
              />
              <StatusItem 
                label="Contact Events Table" 
                status={status.contact_events_table_exists}
                description="Detailed interaction tracking"
              />
              <StatusItem 
                label="Contacts Populated" 
                status={status.contacts_populated}
                description="Lead data migrated to contacts table"
              />
              <StatusItem 
                label="Events Linked to Contacts" 
                status={status.events_linked_to_contacts}
                description={status.link_percentage ? `${status.link_percentage}% of events linked` : "Events connected to contact records"}
              />
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Overall Status:</p>
              <p className={`mt-1 text-lg font-semibold ${status.migration_complete ? 'text-green-600' : 'text-orange-600'}`}>
                {status.migration_complete ? '✅ Migration Complete' : '⚠️ Migration Needed'}
              </p>
            </div>
          </div>
        )}

        {/* Database Statistics */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Statistics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Customers" value={stats.customers} color="blue" />
              <StatCard label="Total Contacts" value={stats.contacts} color="purple" />
              <StatCard label="Total Events" value={stats.events} color="indigo" />
              <StatCard label="Hot Leads" value={stats.hot_leads} color="red" />
              <StatCard label="Warm Leads" value={stats.warm_leads} color="orange" />
              <StatCard label="Cold Leads" value={stats.cold_leads} color="gray" />
              <StatCard label="Linked Events" value={stats.events_with_contact_id} color="green" />
              <StatCard label="Unlinked Events" value={stats.events_without_contact_id} color="yellow" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
          
          <div className="flex gap-4">
            <button
              onClick={runMigration}
              disabled={loading || (status && status.migration_complete)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                loading || (status && status.migration_complete)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : 'Run Migration'}
            </button>
            
            <button
              onClick={checkStatus}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Refresh Status
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
          
          {status && status.migration_complete && (
            <p className="mt-4 text-sm text-green-600">
              ✅ Migration is complete! Your database is now ready for multi-tenant scaling.
            </p>
          )}
        </div>

        {/* Migration Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">What This Migration Does</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Creates a proper contacts table with multi-tenant isolation (each customer's leads are separate)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Migrates existing lead data from JSONB metadata to structured relational tables</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Adds composite unique constraints to prevent duplicate contacts per customer</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Creates performance indexes for fast queries even with millions of records</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Implements lead scoring and temperature classification (hot/warm/cold)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Sets up the foundation for Row-Level Security and data isolation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Status item component
function StatusItem({ label, status, description }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="ml-4">
        {status ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Ready
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  };
  
  return (
    <div className={`p-4 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}
