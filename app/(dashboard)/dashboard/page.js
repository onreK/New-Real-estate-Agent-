'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [businesses, setBusinesses] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's businesses and leads
  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch businesses
      const businessResponse = await fetch('/api/businesses');
      const businessData = await businessResponse.json();
      console.log('Business data received:', businessData);
      
      // Handle both array response and businesses property
      const businessArray = Array.isArray(businessData) ? businessData : (businessData.businesses || []);
      setBusinesses(businessArray);
      
      // Fetch leads
      const leadsResponse = await fetch('/api/leads');
      const leadsData = await leadsResponse.json();
      console.log('Leads data received:', leadsData);
      
      const leadsArray = Array.isArray(leadsData) ? leadsData : (leadsData.leads || []);
      setLeads(leadsArray);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Get the primary business (first one for now)
  const primaryBusiness = businesses.length > 0 ? businesses[0] : null;

  // Calculate stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter(lead => lead.score === 'HOT' || lead.leadScore === 'HOT').length;
  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.timestamp || lead.date);
    const now = new Date();
    return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
  }).length;
  const conversionRate = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;

  // Handle View Site button
  const handleViewSite = () => {
    if (primaryBusiness && primaryBusiness.subdomain) {
      // Create the customer site URL
      const siteUrl = `${window.location.protocol}//${window.location.host}/${primaryBusiness.subdomain}`;
      console.log('Redirecting to:', siteUrl);
      window.open(siteUrl, '_blank');
    } else {
      alert('No business found. Please complete the onboarding process first.');
      router.push('/onboarding');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If no businesses, redirect to onboarding
  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AI Business Automation!</h2>
          <p className="text-gray-600 mb-6">Let's set up your business profile first.</p>
          <button 
            onClick={() => router.push('/onboarding')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {primaryBusiness && (
                <span className="ml-4 text-sm text-gray-500">
                  {primaryBusiness.businessName}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleViewSite}
                className="text-blue-600 hover:text-blue-800 font-medium"
                disabled={!primaryBusiness}
              >
                View Your Site →
              </button>
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={user.imageUrl}
                  alt={user.fullName}
                />
                <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info */}
        <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-medium text-yellow-800">Debug Info:</h3>
          <p className="text-sm text-yellow-700">
            Businesses found: {businesses.length} | 
            Primary business: {primaryBusiness?.businessName || 'None'} | 
            Subdomain: {primaryBusiness?.subdomain || 'None'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                    <dd className="text-3xl font-bold text-blue-600">{totalLeads}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🔥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Hot Leads</dt>
                    <dd className="text-3xl font-bold text-red-600">{hotLeads}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="text-3xl font-bold text-green-600">{thisMonthLeads}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📈</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                    <dd className="text-3xl font-bold text-purple-600">{conversionRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Leads</h3>
            
            {leads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No leads yet. Your AI assistant will capture leads when customers visit your site.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lead.name || lead.customerName || 'Anonymous'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.email || 'No email'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (lead.score === 'HOT' || lead.leadScore === 'HOT') 
                              ? 'bg-red-100 text-red-800' 
                              : (lead.score === 'WARM' || lead.leadScore === 'WARM')
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {lead.score || lead.leadScore || 'COLD'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.timestamp || lead.date 
                            ? new Date(lead.timestamp || lead.date).toLocaleDateString()
                            : 'Unknown'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
