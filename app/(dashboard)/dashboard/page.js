'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [business, setBusiness] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchBusinessData();
      fetchLeads();
    }
  }, [isLoaded, user]);

  const fetchBusinessData = async () => {
    try {
      const response = await fetch('/api/businesses/current');
      if (response.ok) {
        const data = await response.json();
        setBusiness(data);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AI Business Automation!</h1>
          <p className="text-gray-600 mb-6">Let's set up your business profile first.</p>
          <a 
            href="/onboarding"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
  }

  const getLeadScoreColor = (score) => {
    switch(score) {
      case 'HOT': return 'bg-red-100 text-red-800';
      case 'WARM': return 'bg-orange-100 text-orange-800';
      case 'LUKEWARM': return 'bg-yellow-100 text-yellow-800';
      case 'COLD': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business.businessName}</h1>
              <p className="text-gray-600">{business.industry} Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href={`https://${business.subdomain}.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'yoursite.com'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                View Your Site →
              </a>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Leads</h3>
            <p className="text-3xl font-bold text-blue-600">{leads.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Hot Leads</h3>
            <p className="text-3xl font-bold text-red-600">
              {leads.filter(l => l.leadScore === 'HOT').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
            <p className="text-3xl font-bold text-green-600">
              {leads.filter(l => {
                const leadDate = new Date(l.createdAt);
                const now = new Date();
                return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
            <p className="text-3xl font-bold text-purple-600">
              {leads.length > 0 ? Math.round((leads.filter(l => l.leadScore === 'HOT').length / leads.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Leads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.slice(0, 10).map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name || 'Anonymous'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.email || lead.phone || 'No contact'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeadScoreColor(lead.leadScore)}`}>
                        {lead.leadScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
