'use client';

import { useState, useEffect } from 'react';

export default function CustomerSMSDashboard() {
  const [smsService, setSmsService] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    leadsThisMonth: 0,
    responseRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load SMS service info
      const serviceResponse = await fetch('/api/customer-sms/activate?customerId=demo_customer');
      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json();
        if (serviceData.services && serviceData.services.length > 0) {
          setSmsService(serviceData.services[0]);
        }
      }

      // Load conversations (would filter by customer's phone number in production)
      const convResponse = await fetch('/api/sms/conversations');
      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData.conversations || []);
        setStats(convData.stats || stats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setIsLoading(false);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
    }
    return phone;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConversationPreview = (conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return lastMessage ? lastMessage.body.substring(0, 50) + '...' : 'No messages';
  };

  const isRecentActivity = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const hoursDiff = (now - messageTime) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your SMS dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">📱 My SMS AI Dashboard</h1>
              {smsService && (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Active
                  </span>
                  <span className="text-sm text-gray-600">
                    {smsService.businessName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Main Dashboard
              </a>
              <a href="/ai-config" className="text-gray-600 hover:text-gray-800">
                ⚙️ AI Settings
              </a>
              <button
                onClick={loadDashboardData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!smsService ? (
          /* No SMS Service Active */
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📱</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">SMS AI Not Active</h2>
            <p className="text-gray-600 mb-6">
              You haven't set up SMS AI yet. Get started to enable text message conversations with your customers.
            </p>
            <a 
              href="/sms-onboarding"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
            >
              🚀 Set Up SMS AI
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Service Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📞 Your SMS AI Service</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-600">Business Number</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatPhoneNumber(smsService.phoneNumber)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Active since {formatTime(smsService.activatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">AI Personality</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">
                    {smsService.personality}
                  </div>
                  <div className="text-xs text-gray-500">
                    Business: {smsService.businessName}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Plan</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {smsService.billing?.planName || 'Pro SMS AI'}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${smsService.billing?.monthlyFee || 299}/month
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-blue-600 text-2xl mr-4">💬</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-green-600 text-2xl mr-4">📨</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Messages This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-purple-600 text-2xl mr-4">🎯</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.smsLeads || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-orange-600 text-2xl mr-4">⚡</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-2xl font-bold text-gray-900">98%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href="/ai-config"
                  className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="text-blue-600 text-xl mb-2">🤖</div>
                  <div className="font-medium">Update AI Settings</div>
                  <div className="text-sm text-gray-600">Change personality, business info, responses</div>
                </a>
                
                <a 
                  href="/test-ai"
                  className="p-4 border rounded-lg hover:border-green-500 transition-colors"
                >
                  <div className="text-green-600 text-xl mb-2">🧪</div>
                  <div className="font-medium">Test AI Responses</div>
                  <div className="text-sm text-gray-600">Send test messages and see AI responses</div>
                </a>

                <div className="p-4 border rounded-lg hover:border-purple-500 transition-colors cursor-pointer">
                  <div className="text-purple-600 text-xl mb-2">📊</div>
                  <div className="font-medium">View Analytics</div>
                  <div className="text-sm text-gray-600">See detailed conversation analytics</div>
                </div>
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversation List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Conversations</h2>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {conversations.length > 0 ? (
                      conversations.slice(0, 10).map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation)}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                            selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{formatPhoneNumber(conversation.from)}</p>
                            {isRecentActivity(conversation.lastActivity) && (
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {formatTime(conversation.lastActivity)}
                          </p>
                          <p className="text-sm text-gray-800">
                            {getConversationPreview(conversation)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {conversation.messages.length} messages
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-600">
                        <p>No conversations yet</p>
                        <p className="text-sm mt-2">Customers will appear here when they text your business number</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversation Detail */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedConversation ? 
                        `Conversation with ${formatPhoneNumber(selectedConversation.from)}` : 
                        'Select a conversation'
                      }
                    </h2>
                  </div>
                  <div className="p-6">
                    {selectedConversation ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {selectedConversation.messages.map((message, index) => (
                          <div
                            key={message.id || index}
                            className={`flex ${message.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                message.direction === 'inbound'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <p className="text-sm">{message.body}</p>
                              <p className={`text-xs mt-1 ${
                                message.direction === 'inbound' ? 'text-gray-500' : 'text-blue-100'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-4xl mb-4">💬</div>
                        <p className="text-gray-600">Select a conversation to view messages</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sharing Section */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">📢 Share Your SMS Number</h2>
              <p className="text-blue-800 mb-4">
                Your customers can now text <strong>{formatPhoneNumber(smsService.phoneNumber)}</strong> to get instant AI-powered support!
              </p>
              <div className="space-y-2 text-sm text-blue-700">
                <p><strong>Add to your website:</strong> "Text us at {formatPhoneNumber(smsService.phoneNumber)} for instant support!"</p>
                <p><strong>Include in emails:</strong> "Have questions? Text {formatPhoneNumber(smsService.phoneNumber)} for quick answers."</p>
                <p><strong>Social media:</strong> "DM us or text {formatPhoneNumber(smsService.phoneNumber)} - we're here to help!"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
