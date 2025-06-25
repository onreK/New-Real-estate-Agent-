'use client';

import { useState, useEffect } from 'react';

export default function CustomerSMSDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    conversations: [],
    totalConversations: 0,
    totalMessages: 0,
    leadsGenerated: 0,
    hotLeadAlerts: [],
    hotLeadStats: {
      totalHotLeads: 0,
      alertsLast24h: 0,
      averageScore: 0,
      highestScore: 0
    },
    smsConfig: null
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load SMS conversations
      const conversationsResponse = await fetch('/api/sms/conversations');
      const conversationsData = await conversationsResponse.json();
      
      // Load SMS configuration (assuming we have a phone number)
      let smsConfig = null;
      let hotLeadAlerts = [];
      let hotLeadStats = {
        totalHotLeads: 0,
        alertsLast24h: 0,
        averageScore: 0,
        highestScore: 0
      };

      // Try to get configuration for the first phone number found
      if (conversationsData.conversations && conversationsData.conversations.length > 0) {
        const phoneNumber = conversationsData.conversations[0].toNumber;
        
        try {
          const configResponse = await fetch(`/api/customer-sms/configure-ai?phoneNumber=${phoneNumber}`);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            smsConfig = configData.config;

            // Load hot lead alerts if business owner phone is configured
            if (smsConfig?.businessOwnerPhone) {
              const alertsResponse = await fetch(`/api/business-owner-alerts?phone=${encodeURIComponent(smsConfig.businessOwnerPhone)}`);
              if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                hotLeadAlerts = alertsData.alerts || [];
                hotLeadStats = alertsData.stats || hotLeadStats;
              }
            }
          }
        } catch (configError) {
          console.warn('Could not load SMS configuration:', configError);
        }
      }

      setDashboardData({
        conversations: conversationsData.conversations || [],
        totalConversations: conversationsData.totalConversations || 0,
        totalMessages: conversationsData.totalMessages || 0,
        leadsGenerated: conversationsData.conversations?.filter(c => c.leadCaptured).length || 0,
        hotLeadAlerts,
        hotLeadStats,
        smsConfig
      });

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (number) => {
    if (!number) return 'Unknown';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const areaCode = cleaned.slice(1, 4);
      const exchange = cleaned.slice(4, 7);
      const number_suffix = cleaned.slice(7);
      return `+1 (${areaCode}) ${exchange}-${number_suffix}`;
    }
    return number;
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'text-red-600 bg-red-100';
    if (score >= 7) return 'text-orange-600 bg-orange-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getScoreEmoji = (score) => {
    if (score >= 9) return '🚨';
    if (score >= 7) return '🔥';
    if (score >= 5) return '⚡';
    return '📝';
  };

  const toggleHotLeadAlerts = async () => {
    if (!dashboardData.smsConfig?.phoneNumber) return;

    try {
      const newSetting = !dashboardData.smsConfig.enableHotLeadAlerts;
      
      const response = await fetch('/api/customer-sms/configure-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: dashboardData.smsConfig.phoneNumber,
          updates: { enableHotLeadAlerts: newSetting }
        })
      });

      if (response.ok) {
        setDashboardData(prev => ({
          ...prev,
          smsConfig: { ...prev.smsConfig, enableHotLeadAlerts: newSetting }
        }));
      }
    } catch (error) {
      console.error('Failed to toggle hot lead alerts:', error);
    }
  };

  const toggleBusinessHours = async () => {
    if (!dashboardData.smsConfig?.phoneNumber) return;

    try {
      const newSetting = !dashboardData.smsConfig.alertBusinessHours;
      
      const response = await fetch('/api/customer-sms/configure-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: dashboardData.smsConfig.phoneNumber,
          updates: { alertBusinessHours: newSetting }
        })
      });

      if (response.ok) {
        setDashboardData(prev => ({
          ...prev,
          smsConfig: { ...prev.smsConfig, alertBusinessHours: newSetting }
        }));
      }
    } catch (error) {
      console.error('Failed to toggle business hours setting:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SMS dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📱 SMS AI Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {dashboardData.smsConfig?.businessName || 'Your Business'} SMS Assistant
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadDashboardData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => window.location.href = '/sms-onboarding'}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💬</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalConversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📨</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👥</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Leads Generated</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.leadsGenerated}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔥</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Hot Leads (24h)</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.hotLeadStats.alertsLast24h}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'conversations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                💬 Conversations
              </button>
              <button
                onClick={() => setActiveTab('hotleads')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'hotleads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔥 Hot Lead Alerts
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SMS Configuration Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚙️ SMS AI Configuration</h2>
              {dashboardData.smsConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">📱 SMS Number:</span>
                      <span className="font-mono">{formatPhoneNumber(dashboardData.smsConfig.phoneNumber)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">🏢 Business:</span>
                      <span>{dashboardData.smsConfig.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">🤖 Personality:</span>
                      <span className="capitalize">{dashboardData.smsConfig.personality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">📝 Model:</span>
                      <span>{dashboardData.smsConfig.model}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">🔥 Hot Lead Alerts:</span>
                      <span className={dashboardData.smsConfig.enableHotLeadAlerts ? 'text-green-600' : 'text-red-600'}>
                        {dashboardData.smsConfig.enableHotLeadAlerts ? '✅ Enabled' : '❌ Disabled'}
                      </span>
                    </div>
                    {dashboardData.smsConfig.enableHotLeadAlerts && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium">📞 Alert Phone:</span>
                          <span className="font-mono">{dashboardData.smsConfig.businessOwnerPhone || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">🕐 Business Hours:</span>
                          <span>{dashboardData.smsConfig.alertBusinessHours ? '✅ Enabled' : '❌ 24/7'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium">📅 Last Updated:</span>
                      <span>{new Date(dashboardData.smsConfig.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No SMS configuration found</p>
                  <button
                    onClick={() => window.location.href = '/sms-onboarding'}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    🚀 Set Up SMS AI
                  </button>
                </div>
              )}
            </div>

            {/* Hot Lead Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🔥 Hot Lead Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{dashboardData.hotLeadStats.totalHotLeads}</div>
                  <div className="text-sm text-red-700">Total Hot Leads</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{dashboardData.hotLeadStats.alertsLast24h}</div>
                  <div className="text-sm text-orange-700">Alerts (24h)</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dashboardData.hotLeadStats.averageScore}</div>
                  <div className="text-sm text-blue-700">Average Score</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{dashboardData.hotLeadStats.highestScore}</div>
                  <div className="text-sm text-purple-700">Highest Score</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={toggleHotLeadAlerts}
                  className={`p-4 rounded-lg border ${
                    dashboardData.smsConfig?.enableHotLeadAlerts
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="text-xl mb-2">
                    {dashboardData.smsConfig?.enableHotLeadAlerts ? '🔥' : '❄️'}
                  </div>
                  <div className="text-sm font-medium">
                    {dashboardData.smsConfig?.enableHotLeadAlerts ? 'Disable' : 'Enable'} Hot Lead Alerts
                  </div>
                </button>

                <button
                  onClick={toggleBusinessHours}
                  className={`p-4 rounded-lg border ${
                    dashboardData.smsConfig?.alertBusinessHours
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="text-xl mb-2">🕐</div>
                  <div className="text-sm font-medium">
                    {dashboardData.smsConfig?.alertBusinessHours ? 'Business Hours' : '24/7 Alerts'}
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/sms-onboarding'}
                  className="p-4 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800"
                >
                  <div className="text-xl mb-2">⚙️</div>
                  <div className="text-sm font-medium">Configure Settings</div>
                </button>

                <button
                  onClick={loadDashboardData}
                  className="p-4 rounded-lg border bg-purple-50 border-purple-200 text-purple-800"
                >
                  <div className="text-xl mb-2">🔄</div>
                  <div className="text-sm font-medium">Refresh Data</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">💬 Recent Conversations</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {dashboardData.conversations.length > 0 ? (
                dashboardData.conversations.slice(0, 10).map((conversation, index) => (
                  <div key={conversation.id || index} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium">{formatPhoneNumber(conversation.fromNumber)}</span>
                          {conversation.leadCaptured && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              📝 Lead
                            </span>
                          )}
                          {conversation.messages?.some(m => m.hotLeadScore >= 7) && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              🔥 Hot Lead
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {conversation.messages?.length || 0} messages • 
                          Started {new Date(conversation.createdAt).toLocaleDateString()}
                        </div>
                        {conversation.messages?.length > 0 && (
                          <div className="text-sm text-gray-800">
                            Last: "{conversation.messages[conversation.messages.length - 1].body.slice(0, 100)}..."
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {conversation.messages?.some(m => m.hotLeadScore >= 7) && (
                          <div className="text-right mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(Math.max(...conversation.messages.map(m => m.hotLeadScore || 0)))}`}>
                              {getScoreEmoji(Math.max(...conversation.messages.map(m => m.hotLeadScore || 0)))} 
                              {Math.max(...conversation.messages.map(m => m.hotLeadScore || 0))}/10
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(conversation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-600">SMS conversations will appear here once customers start texting your AI.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hot Leads Tab */}
        {activeTab === 'hotleads' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">🔥 Hot Lead Alerts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Real-time alerts sent to {dashboardData.smsConfig?.businessOwnerPhone || 'business owner'}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {dashboardData.hotLeadAlerts.length > 0 ? (
                dashboardData.hotLeadAlerts.map((alert, index) => (
                  <div key={alert.id || index} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`text-lg ${getScoreColor(alert.leadInfo?.score || 0)}`}>
                            {getScoreEmoji(alert.leadInfo?.score || 0)}
                          </span>
                          <span className="font-medium">
                            Score: {alert.leadInfo?.score || 0}/10
                          </span>
                          <span className="text-sm text-gray-500">
                            from {alert.source === 'sms' ? 'SMS' : 'Website'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-800 mb-2">
                          "{alert.messageContent}"
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>AI Reasoning:</strong> {alert.leadInfo?.reasoning}
                        </div>
                        {alert.leadInfo?.nextAction && (
                          <div className="text-sm text-blue-600 mt-1">
                            <strong>Suggested Action:</strong> {alert.leadInfo.nextAction}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{new Date(alert.timestamp).toLocaleDateString()}</div>
                        <div>{new Date(alert.timestamp).toLocaleTimeString()}</div>
                        {alert.alertSent && (
                          <div className="text-green-600 mt-1">✅ Alert Sent</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">🔥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hot leads detected yet</h3>
                  <p className="text-gray-600 mb-4">
                    Hot lead alerts will appear here when our AI detects high-intent customers.
                  </p>
                  {!dashboardData.smsConfig?.enableHotLeadAlerts && (
                    <button
                      onClick={toggleHotLeadAlerts}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      🔥 Enable Hot Lead Alerts
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
