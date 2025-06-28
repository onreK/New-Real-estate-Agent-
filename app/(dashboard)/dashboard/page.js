'use client';

import { useState, useEffect } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { 
  Users, MessageCircle, TrendingUp, Zap, Phone, Mail, 
  Calendar, BarChart3, DollarSign, Clock, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Star, Shield,
  Crown, CheckCircle, AlertTriangle, Settings, RefreshCw
} from 'lucide-react';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Keep your existing state structure
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

  // Keep your existing data loading logic
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

  // Keep your existing utility functions
  const formatPhoneNumber = (number) => {
    return number; // Already formatted
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'active': return 'text-green-400 bg-green-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/20';
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

  // Premium stat card component
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }) => (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:bg-white/15">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${
            color === 'blue' ? 'from-blue-500/20 to-purple-500/20' :
            color === 'green' ? 'from-green-500/20 to-emerald-500/20' :
            color === 'orange' ? 'from-orange-500/20 to-red-500/20' :
            color === 'purple' ? 'from-purple-500/20 to-pink-500/20' :
            'from-gray-500/20 to-slate-500/20'
          }`}>
            <Icon className={`w-6 h-6 ${
              color === 'blue' ? 'text-blue-400' :
              color === 'green' ? 'text-green-400' :
              color === 'orange' ? 'text-orange-400' :
              color === 'purple' ? 'text-purple-400' :
              'text-gray-400'
            }`} />
          </div>
          
          {trend && (
            <div className={`flex items-center text-sm ${
              trend > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
          <p className="text-gray-400 text-sm">{title}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          </div>
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Premium Header */}
      <div className="border-b border-white/10 backdrop-blur-lg bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold text-white">IntelliHub AI</h1>
              </div>
              <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                <span className="text-purple-300 text-sm font-medium">AI Business Dashboard</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={loadDashboardData}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Test AI</span>
                </button>
              </div>

              {/* User Profile */}
              {isLoaded && user && (
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user.primaryEmailAddress?.emailAddress}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.firstName?.charAt(0) || user.primaryEmailAddress?.emailAddress.charAt(0) || '?'}
                  </div>
                  <SignOutButton>
                    <button className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 hover:bg-red-500/10 rounded transition-colors">
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Premium Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-white/20">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'webchat', label: 'Web Chat AI', icon: MessageCircle },
                { id: 'sms', label: 'SMS AI & Hot Leads', icon: Phone },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Combined Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                title="Total Leads"
                value={dashboardData.combined.totalLeads}
                subtitle="Web + SMS"
                trend={23}
                color="blue"
              />
              <StatCard
                icon={MessageCircle}
                title="Conversations"
                value={dashboardData.combined.totalConversations}
                subtitle="All channels"
                trend={15}
                color="green"
              />
              <StatCard
                icon={Activity}
                title="Total Messages"
                value={dashboardData.combined.totalMessages}
                subtitle="AI responses"
                color="purple"
              />
              <StatCard
                icon={Target}
                title="Hot Leads (24h)"
                value={dashboardData.combined.hotLeadsToday}
                subtitle="High intent"
                color="orange"
              />
            </div>

            {/* Channel Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Web Chat Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Web Chat AI</h2>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(dashboardData.webChat.aiStatus)}`}>
                        {getStatusText(dashboardData.webChat.aiStatus)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-400">{dashboardData.webChat.totalConversations}</div>
                    <div className="text-xs text-gray-400">Conversations</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-400">{dashboardData.webChat.leadsGenerated}</div>
                    <div className="text-xs text-gray-400">Leads</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-400">{dashboardData.webChat.totalMessages}</div>
                    <div className="text-xs text-gray-400">Messages</div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.href = '/demo'}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Test Chat
                  </button>
                  <button
                    onClick={() => window.location.href = '/ai-config'}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Configure
                  </button>
                </div>
              </div>

              {/* SMS Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Phone className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">SMS AI</h2>
                      <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400">
                        A2P Pending
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <div className="text-xl font-bold text-purple-400">{dashboardData.sms.totalConversations}</div>
                    <div className="text-xs text-gray-400">Conversations</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-400">{dashboardData.sms.leadsGenerated}</div>
                    <div className="text-xs text-gray-400">Leads</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-400">{dashboardData.sms.phoneNumbers.length}</div>
                    <div className="text-xs text-gray-400">Active Numbers</div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setActiveTab('sms')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    SMS Dashboard
                  </button>
                  <button
                    onClick={() => window.location.href = '/sms-onboarding'}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Setup SMS
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: MessageCircle, label: "Test AI Chat", color: "blue", action: () => window.location.href = '/demo' },
                  { icon: Settings, label: "Configure AI", color: "purple", action: () => window.location.href = '/ai-config' },
                  { icon: Phone, label: "SMS Dashboard", color: "green", action: () => setActiveTab('sms') },
                  { icon: Sparkles, label: "Setup SMS AI", color: "orange", action: () => window.location.href = '/sms-onboarding' }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`p-4 bg-gradient-to-br ${
                      action.color === 'blue' ? 'from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30' :
                      action.color === 'purple' ? 'from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30' :
                      action.color === 'green' ? 'from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30' :
                      'from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30'
                    } rounded-xl border border-white/20 text-center transition-all duration-200 hover:scale-105`}
                  >
                    <action.icon className={`w-8 h-8 mx-auto mb-2 ${
                      action.color === 'blue' ? 'text-blue-400' :
                      action.color === 'purple' ? 'text-purple-400' :
                      action.color === 'green' ? 'text-green-400' :
                      'text-orange-400'
                    }`} />
                    <p className="text-white text-sm font-medium">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Keep all your existing tab content but with premium styling */}
        {/* Web Chat Tab */}
        {activeTab === 'webchat' && (
          <div className="space-y-6">
            {/* Web Chat Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={MessageCircle}
                title="Conversations"
                value={dashboardData.webChat.totalConversations}
                color="blue"
              />
              <StatCard
                icon={Mail}
                title="Messages"
                value={dashboardData.webChat.totalMessages}
                color="purple"
              />
              <StatCard
                icon={Users}
                title="Leads"
                value={dashboardData.webChat.leadsGenerated}
                color="green"
              />
              <StatCard
                icon={Activity}
                title="AI Status"
                value={getStatusText(dashboardData.webChat.aiStatus)}
                color="orange"
              />
            </div>

            {/* Keep your existing Web Chat Actions and Recent Conversations but with premium styling */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Web Chat Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white rounded-xl hover:from-blue-500/30 hover:to-purple-500/30 text-center transition-all duration-200"
                >
                  <Zap className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <div className="font-medium mb-1">Test AI Chat</div>
                  <div className="text-sm text-gray-300">Try your AI assistant</div>
                </button>
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 text-center transition-all duration-200"
                >
                  <Settings className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                  <div className="font-medium mb-1">Configure AI</div>
                  <div className="text-sm text-gray-300">Personality & training</div>
                </button>
                <button
                  onClick={() => alert('Embed code generator coming soon!')}
                  className="p-6 bg-gradient-to-br from-gray-500/20 to-slate-500/20 text-white rounded-xl hover:from-gray-500/30 hover:to-slate-500/30 text-center transition-all duration-200"
                >
                  <Activity className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <div className="font-medium mb-1">Get Embed Code</div>
                  <div className="text-sm text-gray-300">Add to your website</div>
                </button>
              </div>
            </div>

            {/* Recent Web Chat Conversations with premium styling */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Recent Web Chat Conversations</h2>
              {dashboardData.webChat.conversations.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.webChat.conversations.slice(0, 5).map((conversation, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-white">Web Visitor #{conversation.id}</div>
                          <div className="text-sm text-gray-400">{conversation.messages?.length || 0} messages</div>
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
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-4">No web chat conversations yet</p>
                  <button
                    onClick={() => window.location.href = '/demo'}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Test Your AI Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SMS Tab - Keep your existing functionality with premium styling */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            {/* SMS Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={Phone}
                title="SMS Conversations"
                value={dashboardData.sms.totalConversations}
                color="purple"
              />
              <StatCard
                icon={MessageCircle}
                title="SMS Messages"
                value={dashboardData.sms.totalMessages}
                color="blue"
              />
              <StatCard
                icon={Users}
                title="SMS Leads"
                value={dashboardData.sms.leadsGenerated}
                color="green"
              />
              <StatCard
                icon={Target}
                title="Hot Leads (24h)"
                value={dashboardData.sms.hotLeadStats.alertsLast24h}
                color="orange"
              />
            </div>

            {/* Phone Numbers with premium styling */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Business Phone Numbers</h2>
              <div className="space-y-3">
                {dashboardData.sms.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <div className="font-mono text-lg font-semibold text-white">{phone.number}</div>
                      <div className="text-sm text-gray-400">SMS AI Assistant</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(phone.status)}`}>
                      {getStatusText(phone.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* A2P Status Alert with premium styling */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-yellow-400 mr-3" />
                <h3 className="text-xl font-semibold text-yellow-300">A2P 10DLC Registration Pending</h3>
              </div>
              <p className="text-yellow-100 mb-6">
                Your SMS numbers are active for receiving messages and AI processing. SMS sending capability will be enabled once Twilio completes your A2P registration (typically 2-3 business days).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                  <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Currently Working:
                  </h4>
                  <ul className="text-sm text-green-200 space-y-1">
                    <li>• Receiving SMS messages</li>
                    <li>• AI processing & responses</li>
                    <li>• Hot lead detection</li>
                    <li>• Lead capture & analytics</li>
                  </ul>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                  <h4 className="font-semibold text-yellow-300 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Coming Soon:
                  </h4>
                  <ul className="text-sm text-yellow-200 space-y-1">
                    <li>• Sending SMS responses</li>
                    <li>• Business owner alerts</li>
                    <li>• Full two-way SMS chat</li>
                    <li>• SMS marketing campaigns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Keep your existing SMS Actions and Recent Conversations with premium styling */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">SMS Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/sms-dashboard'}
                  className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-white rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 text-center transition-all duration-200"
                >
                  <BarChart3 className="w-8 h-8 mx-auto mb-3 text-green-400" />
                  <div className="font-medium mb-1">SMS Dashboard</div>
                  <div className="text-sm text-gray-300">Detailed SMS analytics</div>
                </button>
                <button
                  onClick={() => window.location.href = '/sms-onboarding'}
                  className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white rounded-xl hover:from-blue-500/30 hover:to-purple-500/30 text-center transition-all duration-200"
                >
                  <Settings className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <div className="font-medium mb-1">SMS Settings</div>
                  <div className="text-sm text-gray-300">Configure SMS AI</div>
                </button>
                <button
                  onClick={() => alert('Customer SMS setup interface coming soon!')}
                  className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 text-center transition-all duration-200"
                >
                  <Users className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                  <div className="font-medium mb-1">Customer Setup</div>
                  <div className="text-sm text-gray-300">For your customers</div>
                </button>
              </div>
            </div>

            {/* Recent SMS Conversations with premium styling */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Recent SMS Conversations</h2>
              {dashboardData.sms.conversations.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.sms.conversations.slice(0, 5).map((conversation, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-3 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-white">{formatPhoneNumber(conversation.fromNumber)}</div>
                          <div className="text-sm text-gray-400">{conversation.messages?.length || 0} messages</div>
                          {conversation.leadCaptured && (
                            <span className="inline-block bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full mt-1 border border-green-500/30">
                              Lead Captured
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
                  <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">No SMS conversations yet</p>
                  <p className="text-sm text-gray-400 mb-6">
                    Test by texting: {dashboardData.sms.phoneNumbers[0]?.number}
                  </p>
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-200">
                      <strong>💡 Test Hot Lead Detection:</strong><br/>
                      Text "I want to buy a house today" to see the AI detect high intent!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab with premium styling */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Platform Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium text-white flex items-center">
                    <Sparkles className="w-5 h-5 text-purple-400 mr-2" />
                    AI Configuration
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/ai-config'}
                      className="w-full text-left p-4 bg-white/5 border border-white/20 rounded-xl hover:border-blue-400/50 hover:bg-blue-500/10 transition-all duration-200"
                    >
                      <div className="font-medium text-white">AI Personality & Training</div>
                      <div className="text-sm text-gray-400">Configure AI behavior and knowledge</div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/test-ai'}
                      className="w-full text-left p-4 bg-white/5 border border-white/20 rounded-xl hover:border-blue-400/50 hover:bg-blue-500/10 transition-all duration-200"
                    >
                      <div className="font-medium text-white">Test AI Connection</div>
                      <div className="text-sm text-gray-400">Verify OpenAI integration</div>
                    </button>
                  </div>
                </div>

                {/* SMS Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium text-white flex items-center">
                    <Phone className="w-5 h-5 text-green-400 mr-2" />
                    SMS Configuration
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/sms-onboarding'}
                      className="w-full text-left p-4 bg-white/5 border border-white/20 rounded-xl hover:border-green-400/50 hover:bg-green-500/10 transition-all duration-200"
                    >
                      <div className="font-medium text-white">SMS AI Setup</div>
                      <div className="text-sm text-gray-400">Configure SMS assistant & hot leads</div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/sms-setup'}
                      className="w-full text-left p-4 bg-white/5 border border-white/20 rounded-xl hover:border-green-400/50 hover:bg-green-500/10 transition-all duration-200"
                    >
                      <div className="font-medium text-white">SMS Technical Setup</div>
                      <div className="text-sm text-gray-400">Developer configuration guide</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Platform Status */}
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-medium text-white mb-4 flex items-center">
                  <Activity className="w-5 h-5 text-blue-400 mr-2" />
                  Platform Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Web Chat AI:</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(dashboardData.webChat.aiStatus)}`}>
                      {getStatusText(dashboardData.webChat.aiStatus)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">SMS Receiving:</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                      ✅ Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">SMS Sending:</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
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
