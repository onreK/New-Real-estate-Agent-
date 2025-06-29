// app/dashboard/email/page.jsx
// Email management page that combines configuration and dashboard

import React, { useState } from 'react';
import EmailConfigPanel from '../../../components/email/EmailConfigPanel.jsx';
import EmailDashboard from '../../../components/email/EmailDashboard.jsx';

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-lg max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'config'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Configuration
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <EmailDashboard />}
        {activeTab === 'config' && <EmailConfigPanel />}
      </div>
    </div>
  );
}
