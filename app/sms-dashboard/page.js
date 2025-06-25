'use client';

import { useState, useEffect } from 'react';

export default function SMSDashboard() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    activeConversations: 0,
    smsLeads: 0
  });

  useEffect(() => {
    loadSMSData();
    // Refresh every 30 seconds
    const interval = setInterval(loadSMSData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSMSData = async () => {
    try {
      // Load conversations
      const convResponse = await fetch('/api/sms/conversations');
      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData.conversations);
        setStats(convData.stats);
      }

      // Load phone numbers
      const phoneResponse = await fetch('/api/sms/phone-numbers');
      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        setPhoneNumbers(phoneData.numbers);
      }
    } catch (error) {
      console.error('Error loading SMS data:', error);
    }
    setIsLoading(false);
  };

  const formatPhone = (phone) => {
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
          <p className="text-gray-600">Loading SMS dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">📱 SMS Dashboard</h1>
              <div className="flex space-x-4">
                <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
                  ← Back to Main Dashboard
                </a>
                <a href="/ai-config" className="text-gray-600 hover:text-gray-800">
                  ⚙️ AI Config
                </a>
              </div>
            </div>
            <button
              onClick={loadSMSData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-orange-600 text-2xl mr-4">🔥</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeConversations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-purple-600 text-2xl mr-4">🎯</div>
              <div>
                <p className="text-sm font-medium text-gray-600">SMS Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.smsLeads}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Numbers Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">📞 Business Phone Numbers</h2>
          </div>
          <div className="p-6">
            {phoneNumbers.length > 0 ? (
              <div className="space-y-4">
                {phoneNumbers.map((number, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{formatPhone(number.phoneNumber)}</p>
                      <p className="text-sm text-gray-600">{number.friendlyName || 'SMS-enabled number'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No SMS numbers configured yet</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  + Add Phone Number
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conversations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Conversations</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{formatPhone(conversation.from)}</p>
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
                    <p>No SMS conversations yet</p>
                    <p className="text-sm mt-2">Conversations will appear here when customers text your business number</p>
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
                    `Conversation with ${formatPhone(selectedConversation.from)}` : 
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
      </div>
    </div>
  );
}
