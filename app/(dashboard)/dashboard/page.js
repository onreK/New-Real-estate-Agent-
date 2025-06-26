'use client';

import { useState, useEffect } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [dashboardData, setDashboardData] = useState({
    // Web Chat Data
    webChat: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      aiStatus: 'checking'
    },
    // SMS Data
    sms: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      phoneNumbers: [],
      hotLeadAlerts: [],
      hotLeadStats: {
        totalHotLeads: 0,
        alertsLast24h: 0,
        averageScore: 0,
        highestScore: 0
      }
    },
    // Combined Stats
    combined: {
      totalLeads: 0,
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0
    }
  });

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load Web Chat data
      const webChatResponse = await fetch('/api/chat?action=conversations');
      const webChatData = await webChatResponse.json();
      
      // Check AI connection status
      const aiStatusResponse = await fetch('/api/chat?action=test-connection');
      const aiStatusData = await aiStatusResponse.json();
      
      // Load SMS data
      const smsResponse = await fetch('/api/sms/conversations');
      const smsData = await smsResponse.json();
      
      // Combine data
      const webChat = {
        conversations: webChatData.conversations || [],
        totalConversations: webChatData.totalConversations || 0,
        totalMessages: webChatData.totalMessages || 0,
        leadsGenerated: webChatData.leadsGenerated || 0,
        aiStatus: aiStatusData.connected ? 'connected' : 'error'
      };
      
      const sms = {
        conversations: smsData.conversations || [],
        totalConversations: smsData.totalConversations || 0,
        totalMessages: smsData.totalMessages || 0,
        leadsGenerated: smsData.conversations?.filter(c => c.leadCaptured).length || 0,
        phoneNumbers: [
          { number: '+1 (804) 259-0098', status: 'active' },
          { number: '+1 (877) 691-4103', status: 'active' }
        ],
        hotLeadAlerts: [],
        hotLeadStats: {
          totalHotLeads: 0,
          alertsLast24h: 0,
          averageScore: 0,
          highestScore: 0
        }
      };
      
      // Calculate combined stats
      const combined = {
        totalLeads: webChat.leadsGenerated + sms.leadsGenerated,
        totalConversations: webChat.totalConversations + sms.totalConversations,
        totalMessages: webChat.totalMessages + sms.totalMessages,
        hotLeadsToday: sms.hotLeadStats.alertsLast24h
      };
      
      setDashboardData({ webChat, sms, combined });
      
    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (number) => {
    return number; // Already formatted
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'active': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return '✅ Connected';
      case 'active': return '✅ Active';
      case 'error': return '❌ Error';
      default: return '⏳ Checking';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">🚀 AI Business Dashboard</h1>
              <p className="text-gray-600 mt-1">Complete AI customer engagement platform</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Profile & Logout */}
              {isLoaded && user && (
                <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.primaryEmailAddress?.emailAddress}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.firstName?.charAt(0) || user.primaryEmailAddress?.emailAddress.charAt(0) || '?'}
                  </div>
                  <SignOutButton>
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors">
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={loadDashboardData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  🧪 Test AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

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
                onClick={() => setActiveTab('webchat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'webchat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                💬 Web Chat AI
              </button>
              <button
                onClick={() => setActiveTab('sms')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sms'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📱 SMS AI & Hot Leads
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚙️ Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Combined Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.combined.totalLeads}</p>
                    <p className="text-xs text-gray-500">Web + SMS</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">💬</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.combined.totalConversations}</p>
                    <p className="text-xs text-gray-500">All channels</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📨</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.combined.totalMessages}</p>
                    <p className="text-xs text-gray-500">AI responses</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🔥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Hot Leads (24h)</p>
                    <p className="text-2xl font-bold text-red-600">{dashboardData.combined.hotLeadsToday}</p>
                    <p className="text-xs text-gray-500">High intent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Channel Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Web Chat Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">💬 Web Chat AI</h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(dashboardData.webChat.aiStatus)}`}>
                    {getStatusText(dashboardData.webChat.aiStatus)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">{dashboardData.webChat.totalConversations}</div>
                    <div className="text-xs text-gray-600">Conversations</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{dashboardData.webChat.leadsGenerated}</div>
                    <div className="text-xs text-gray-600">Leads</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600">{dashboardData.webChat.totalMessages}</div>
                    <div className="text-xs text-gray-600">Messages</div>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => window.location.href = '/demo'}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    🧪 Test Chat
                  </button>
                  <button
                    onClick={() => window.location.href = '/ai-config'}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    ⚙️ Configure
                  </button>
                </div>
              </div>

              {/* SMS Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">📱 SMS AI</h2>
                  <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-600">
                    ⏳ A2P Pending
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">{dashboardData.sms.totalConversations}</div>
                    <div className="text-xs text-gray-600">Conversations</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{dashboardData.sms.leadsGenerated}</div>
                    <div className="text-xs text-gray-600">Leads</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">{dashboardData.sms.hotLeadStats.alertsLast24h}</div>
                    <div className="text-xs text-gray-600">Hot Leads</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-gray-600">
                    📞 Active Numbers: {dashboardData.sms.phoneNumbers.length}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('sms')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
                    >
                      📱 SMS Dashboard
                    </button>
                    <button
                      onClick={() => window.location.href = '/sms-onboarding'}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 text-sm"
                    >
                      ⚙️ Setup SMS
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="p-4 text-center border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="text-2xl mb-2">🧪</div>
                  <div className="text-sm font-medium">Test AI Chat</div>
                </button>
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="p-4 text-center border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-sm font-medium">Configure AI</div>
                </button>
                <button
                  onClick={() => setActiveTab('sms')}
                  className="p-4 text-center border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <div className="text-2xl mb-2">📱</div>
                  <div className="text-sm font-medium">SMS Dashboard</div>
                </button>
                <button
                  onClick={() => window.location.href = '/sms-onboarding'}
                  className="p-4 text-center border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="text-sm font-medium">Setup SMS AI</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Web Chat Tab */}
        {activeTab === 'webchat' && (
          <div className="space-y-6">
            {/* Web Chat Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">💬</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.webChat.totalConversations}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📨</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.webChat.totalMessages}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData.webChat.leadsGenerated}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🤖</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Status</p>
                    <p className={`text-sm font-bold ${getStatusColor(dashboardData.webChat.aiStatus)}`}>
                      {getStatusText(dashboardData.webChat.aiStatus)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Web Chat Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">💬 Web Chat Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                >
                  <div className="text-xl mb-2">🧪</div>
                  <div className="font-medium">Test AI Chat</div>
                  <div className="text-sm opacity-90">Try your AI assistant</div>
                </button>
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center"
                >
                  <div className="text-xl mb-2">⚙️</div>
                  <div className="font-medium">Configure AI</div>
                  <div className="text-sm opacity-90">Personality & training</div>
                </button>
                <button
                  onClick={() => alert('Embed code generator coming soon!')}
                  className="p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center"
                >
                  <div className="text-xl mb-2">🔌</div>
                  <div className="font-medium">Get Embed Code</div>
                  <div className="text-sm opacity-90">Add to your website</div>
                </button>
              </div>
            </div>

            {/* Recent Web Chat Conversations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Web Chat Conversations</h2>
              {dashboardData.webChat.conversations.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.webChat.conversations.slice(0, 5).map((conversation, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Web Visitor #{conversation.id}</div>
                          <div className="text-sm text-gray-600">{conversation.messages?.length || 0} messages</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(conversation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-gray-600">No web chat conversations yet</p>
                  <button
                    onClick={() => window.location.href = '/demo'}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Test Your AI Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SMS Tab */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            {/* SMS Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📱</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">SMS Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.sms.totalConversations}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📨</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">SMS Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.sms.totalMessages}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">SMS Leads</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData.sms.leadsGenerated}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🔥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Hot Leads (24h)</p>
                    <p className="text-2xl font-bold text-red-600">{dashboardData.sms.hotLeadStats.alertsLast24h}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Numbers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📞 Business Phone Numbers</h2>
              <div className="space-y-3">
                {dashboardData.sms.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-mono text-lg font-semibold">{phone.number}</div>
                      <div className="text-sm text-gray-600">SMS AI Assistant</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(phone.status)}`}>
                      {getStatusText(phone.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Status Alert */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="text-2xl mr-3">⏳</div>
                <h3 className="text-lg font-semibold text-yellow-800">A2P 10DLC Registration Pending</h3>
              </div>
              <p className="text-yellow-700 mb-4">
                Your SMS numbers are active for receiving messages and AI processing. SMS sending capability will be enabled once Twilio completes your A2P registration (typically 2-3 business days).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Currently Working:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Receiving SMS messages</li>
                    <li>• AI processing & responses</li>
                    <li>• Hot lead detection</li>
                    <li>• Lead capture & analytics</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">⏳ Coming Soon:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Sending SMS responses</li>
                    <li>• Business owner alerts</li>
                    <li>• Full two-way SMS chat</li>
                    <li>• SMS marketing campaigns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SMS Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📱 SMS Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/sms-dashboard'}
                  className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
                >
                  <div className="text-xl mb-2">📊</div>
                  <div className="font-medium">SMS Dashboard</div>
                  <div className="text-sm opacity-90">Detailed SMS analytics</div>
                </button>
                <button
                  onClick={() => window.location.href = '/sms-onboarding'}
                  className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                >
                  <div className="text-xl mb-2">⚙️</div>
                  <div className="font-medium">SMS Settings</div>
                  <div className="text-sm opacity-90">Configure SMS AI</div>
                </button>
                <button
                  onClick={() => alert('Customer SMS setup interface coming soon!')}
                  className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center"
                >
                  <div className="text-xl mb-2">👥</div>
                  <div className="font-medium">Customer Setup</div>
                  <div className="text-sm opacity-90">For your customers</div>
                </button>
              </div>
            </div>

            {/* Recent SMS Conversations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent SMS Conversations</h2>
              {dashboardData.sms.conversations.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.sms.conversations.slice(0, 5).map((conversation, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{formatPhoneNumber(conversation.fromNumber)}</div>
                          <div className="text-sm text-gray-600">{conversation.messages?.length || 0} messages</div>
                          {conversation.leadCaptured && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                              📝 Lead Captured
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(conversation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📱</div>
                  <p className="text-gray-600 mb-2">No SMS conversations yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Test by texting: {dashboardData.sms.phoneNumbers[0]?.number}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Test Hot Lead Detection:</strong><br/>
                      Text "I want to buy a house today" to see the AI detect high intent!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">⚙️ Platform Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">🤖 AI Configuration</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/ai-config'}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium">AI Personality & Training</div>
                      <div className="text-sm text-gray-600">Configure AI behavior and knowledge</div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/test-ai'}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium">Test AI Connection</div>
                      <div className="text-sm text-gray-600">Verify OpenAI integration</div>
                    </button>
                  </div>
                </div>

                {/* SMS Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">📱 SMS Configuration</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/sms-onboarding'}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="font-medium">SMS AI Setup</div>
                      <div className="text-sm text-gray-600">Configure SMS assistant & hot leads</div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/sms-setup'}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="font-medium">SMS Technical Setup</div>
                      <div className="text-sm text-gray-600">Developer configuration guide</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Platform Status */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">📊 Platform Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Web Chat AI:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(dashboardData.webChat.aiStatus)}`}>
                      {getStatusText(dashboardData.webChat.aiStatus)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SMS Receiving:</span>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-600">
                      ✅ Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SMS Sending:</span>
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600">
                      ⏳ A2P Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
