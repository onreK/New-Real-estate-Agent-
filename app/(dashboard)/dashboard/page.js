// app/(dashboard)/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { 
  Users, MessageCircle, TrendingUp, Zap, Phone, Mail, 
  Calendar, BarChart3, DollarSign, Clock, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Star, Shield,
  Crown, CheckCircle, AlertTriangle, Settings, RefreshCw,
  Send, FileText, Bot, Inbox, AlertCircle
} from 'lucide-react';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Enhanced state structure with email data
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
    // Email Data
    email: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      hotLeadsToday: 0,
      aiResponseRate: 0,
      emailSettings: null,
      templates: []
    },
    // Facebook Data - NEW!
    facebook: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      hotLeadsToday: 0,
      aiResponseRate: 0,
      facebookSettings: null,
      connectedPages: []
    },
    // Combined Stats
    combined: {
      totalLeads: 0,
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0
    }
  });

  // Tab configuration with Facebook tab
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'webchat', label: 'Web Chat', icon: MessageCircle },
    { id: 'sms', label: 'SMS', icon: Phone },
    { id: 'email', label: 'Email AI', icon: Mail },
    { id: 'facebook', label: 'Facebook', icon: MessageCircle }, // NEW FACEBOOK TAB
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

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
      
      // Load Email data - NEW
      let emailData = { conversations: [], emailSettings: null };
      try {
        const emailResponse = await fetch('/api/customer/email-conversations');
        if (emailResponse.ok) {
          emailData = await emailResponse.json();
        }
      } catch (error) {
        console.log('Email data not available yet');
      }

      // Load Facebook data - NEW
      let facebookData = { conversations: [], facebookSettings: null };
      try {
        const facebookResponse = await fetch('/api/facebook/conversations');
        if (facebookResponse.ok) {
          facebookData = await facebookResponse.json();
        }
      } catch (error) {
        console.log('Facebook data not available yet');
      }

      // Update state with all data
      setDashboardData({
        webChat: {
          conversations: webChatData.conversations || [],
          totalConversations: webChatData.totalConversations || 0,
          totalMessages: webChatData.totalMessages || 0,
          leadsGenerated: webChatData.leadsGenerated || 0,
          aiStatus: aiStatusData.connected ? 'connected' : 'disconnected'
        },
        sms: {
          conversations: smsData.conversations || [],
          totalConversations: smsData.totalConversations || 0,
          totalMessages: smsData.totalMessages || 0,
          leadsGenerated: smsData.leads || 0,
          phoneNumbers: smsData.phoneNumbers || [],
          hotLeadAlerts: smsData.hotLeadAlerts || [],
          hotLeadStats: smsData.hotLeadStats || {
            totalHotLeads: 0,
            alertsLast24h: 0,
            averageScore: 0,
            highestScore: 0
          }
        },
        email: {
          conversations: emailData.conversations || [],
          totalConversations: emailData.conversations?.length || 0,
          totalMessages: emailData.totalMessages || 0,
          leadsGenerated: emailData.leadsGenerated || 0,
          hotLeadsToday: emailData.hotLeadsToday || 0,
          aiResponseRate: emailData.aiResponseRate || 0,
          emailSettings: emailData.emailSettings,
          templates: emailData.templates || []
        },
        facebook: {
          conversations: facebookData.conversations || [],
          totalConversations: facebookData.conversations?.length || 0,
          totalMessages: facebookData.totalMessages || 0,
          leadsGenerated: facebookData.leadsGenerated || 0,
          hotLeadsToday: facebookData.hotLeadsToday || 0,
          aiResponseRate: facebookData.aiResponseRate || 0,
          facebookSettings: facebookData.facebookSettings,
          connectedPages: facebookData.connectedPages || []
        },
        combined: {
          totalLeads: (webChatData.leadsGenerated || 0) + (smsData.leads || 0) + (emailData.leadsGenerated || 0) + (facebookData.leadsGenerated || 0),
          totalConversations: (webChatData.totalConversations || 0) + (smsData.totalConversations || 0) + (emailData.conversations?.length || 0) + (facebookData.conversations?.length || 0),
          totalMessages: (webChatData.totalMessages || 0) + (smsData.totalMessages || 0) + (emailData.totalMessages || 0) + (facebookData.totalMessages || 0),
          hotLeadsToday: (smsData.hotLeadStats?.alertsLast24h || 0) + (emailData.hotLeadsToday || 0) + (facebookData.hotLeadsToday || 0)
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color = 'blue', trend, subtitle }) => (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 bg-gradient-to-br ${
      color === 'blue' ? 'from-blue-500/20 to-purple-500/20' :
      color === 'green' ? 'from-green-500/20 to-emerald-500/20' :
      color === 'orange' ? 'from-orange-500/20 to-red-500/20' :
      color === 'purple' ? 'from-purple-500/20 to-pink-500/20' :
      color === 'teal' ? 'from-teal-500/20 to-cyan-500/20' :
      'from-gray-500/20 to-slate-500/20'
    }`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${
          color === 'blue' ? 'from-blue-500/20 to-purple-500/20' :
          color === 'green' ? 'from-green-500/20 to-emerald-500/20' :
          color === 'orange' ? 'from-orange-500/20 to-red-500/20' :
          color === 'purple' ? 'from-purple-500/20 to-pink-500/20' :
          color === 'teal' ? 'from-teal-500/20 to-cyan-500/20' :
          'from-gray-500/20 to-slate-500/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-400' :
            color === 'green' ? 'text-green-400' :
            color === 'orange' ? 'text-orange-400' :
            color === 'purple' ? 'text-purple-400' :
            color === 'teal' ? 'text-teal-400' :
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
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Business Hub</h1>
                <p className="text-gray-400">Welcome back, {user?.firstName || 'User'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className="w-5 h-5 text-gray-400" onClick={loadDashboardData} />
              </button>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg px-3 py-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Pro Plan</span>
              </div>
              <SignOutButton>
                <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-2xl p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="mt-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={Users}
                  title="Total Conversations"
                  value={dashboardData.combined.totalConversations}
                  color="blue"
                  trend={12}
                />
                <StatCard
                  icon={MessageCircle}
                  title="Messages Processed"
                  value={dashboardData.combined.totalMessages}
                  color="green"
                  trend={8}
                />
                <StatCard
                  icon={Target}
                  title="Leads Generated"
                  value={dashboardData.combined.totalLeads}
                  color="orange"
                  trend={23}
                />
                <StatCard
                  icon={TrendingUp}
                  title="Hot Leads Today"
                  value={dashboardData.combined.hotLeadsToday}
                  color="purple"
                  trend={15}
                />
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Web Chat Actions */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Web Chat AI</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => window.location.href = '/demo'}
                      className="flex flex-col items-center space-y-2 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 transition-colors"
                    >
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                      <span className="text-sm text-white">Test Web Chat</span>
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/sms-onboarding'}
                      className="flex flex-col items-center space-y-2 p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors"
                    >
                      <Phone className="w-6 h-6 text-green-400" />
                      <span className="text-sm text-white">Setup SMS</span>
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/email/setup'}
                      className="flex flex-col items-center space-y-2 p-4 bg-teal-500/20 hover:bg-teal-500/30 rounded-lg border border-teal-500/30 transition-colors"
                    >
                      <Mail className="w-6 h-6 text-teal-400" />
                      <span className="text-sm text-white">Setup Email</span>
                    </button>
                    
                    {/* NEW FACEBOOK BUTTON */}
                    <button
                      onClick={() => window.location.href = '/facebook-setup'}
                      className="flex flex-col items-center space-y-2 p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-600/30 transition-colors"
                    >
                      <MessageCircle className="w-6 h-6 text-blue-300" />
                      <span className="text-sm text-white">Setup Facebook</span>
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/email/manage-templates'}
                      className="flex flex-col items-center space-y-2 p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors"
                    >
                      <FileText className="w-6 h-6 text-purple-400" />
                      <span className="text-sm text-white">Email Templates</span>
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/ai-config'}
                      className="flex flex-col items-center space-y-2 p-4 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 transition-colors"
                    >
                      <Bot className="w-6 h-6 text-orange-400" />
                      <span className="text-sm text-white">AI Config</span>
                    </button>
                  </div>
                </div>

                {/* SMS Status Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-6 h-6 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">SMS AI</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dashboardData.sms.phoneNumbers.length > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {dashboardData.sms.phoneNumbers.length > 0 ? 'Active' : 'Setup Required'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone Numbers</span>
                      <span className="text-white font-medium">{dashboardData.sms.phoneNumbers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversations</span>
                      <span className="text-white font-medium">{dashboardData.sms.totalConversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hot Leads (24h)</span>
                      <span className="text-orange-400 font-medium">{dashboardData.sms.hotLeadStats.alertsLast24h}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/customer-sms-dashboard'}
                    className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Manage SMS
                  </button>
                </div>

                {/* Email AI Status Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-6 h-6 text-teal-400" />
                      <h3 className="text-lg font-semibold text-white">Email AI</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dashboardData.email.emailSettings?.ai_enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {dashboardData.email.emailSettings?.ai_enabled ? 'Configured' : 'Default'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversations</span>
                      <span className="text-white font-medium">{dashboardData.email.totalConversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Templates</span>
                      <span className="text-white font-medium">{dashboardData.email.templates.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hot Leads Today</span>
                      <span className="text-orange-400 font-medium">{dashboardData.email.hotLeadsToday}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/email'}
                    className="w-full mt-4 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Manage Email AI
                  </button>
                </div>
              </div>

              {/* NEW: Facebook AI Status Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-6 h-6 text-blue-300" />
                    <h3 className="text-lg font-semibold text-white">Facebook Messenger AI</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dashboardData.facebook.facebookSettings 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.facebook.facebookSettings ? 'Connected' : 'Setup Required'}
                  </div>
                </div>
                
                {dashboardData.facebook.facebookSettings ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connected Pages</span>
                      <span className="text-white font-medium">{dashboardData.facebook.connectedPages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversations</span>
                      <span className="text-white font-medium">{dashboardData.facebook.totalConversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hot Leads Today</span>
                      <span className="text-orange-400 font-medium">{dashboardData.facebook.hotLeadsToday}</span>
                    </div>
                    <button
                      onClick={() => window.location.href = '/facebook-dashboard'}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Manage Facebook AI
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-semibold text-white mb-2">Facebook AI Not Setup</h4>
                    <p className="text-gray-400 mb-6">Connect your Facebook page to start using AI-powered messenger responses.</p>
                    <button
                      onClick={() => window.location.href = '/facebook-setup'}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Setup Facebook AI
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Web Chat Tab */}
          {activeTab === 'webchat' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  icon={MessageCircle}
                  title="Conversations"
                  value={dashboardData.webChat.totalConversations}
                  color="blue"
                />
                <StatCard
                  icon={Send}
                  title="Messages"
                  value={dashboardData.webChat.totalMessages}
                  color="green"
                />
                <StatCard
                  icon={Target}
                  title="Leads"
                  value={dashboardData.webChat.leadsGenerated}
                  color="orange"
                />
                <StatCard
                  icon={Bot}
                  title="AI Status"
                  value={dashboardData.webChat.aiStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  color={dashboardData.webChat.aiStatus === 'connected' ? 'green' : 'orange'}
                />
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Web Chat Management</h3>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bot className="w-8 h-8 text-blue-400" />
                    <div>
                      <h4 className="text-white font-medium">AI Chat Bot</h4>
                      <p className="text-gray-400 text-sm">Intelligent website chat integration</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dashboardData.webChat.aiStatus === 'connected' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {dashboardData.webChat.aiStatus === 'connected' ? '✅ AI Connected' : '❌ AI Disconnected'}
                  </div>
                  <button
                    onClick={() => window.location.href = '/demo'}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Test Web Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  icon={Phone}
                  title="Phone Numbers"
                  value={dashboardData.sms.phoneNumbers.length}
                  color="green"
                />
                <StatCard
                  icon={MessageCircle}
                  title="Conversations"
                  value={dashboardData.sms.totalConversations}
                  color="blue"
                />
                <StatCard
                  icon={Target}
                  title="Hot Leads"
                  value={dashboardData.sms.hotLeadStats.totalHotLeads}
                  color="orange"
                />
                <StatCard
                  icon={AlertTriangle}
                  title="Alerts (24h)"
                  value={dashboardData.sms.hotLeadStats.alertsLast24h}
                  color="red"
                />
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">SMS Dashboard</h3>
                <button
                  onClick={() => window.location.href = '/customer-sms-dashboard'}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Open SMS Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  icon={Mail}
                  title="Email Conversations"
                  value={dashboardData.email.totalConversations}
                  color="teal"
                />
                <StatCard
                  icon={Send}
                  title="Messages Sent"
                  value={dashboardData.email.totalMessages}
                  color="blue"
                />
                <StatCard
                  icon={Target}
                  title="Leads Generated"
                  value={dashboardData.email.leadsGenerated}
                  color="orange"
                />
                <StatCard
                  icon={FileText}
                  title="Templates"
                  value={dashboardData.email.templates.length}
                  color="purple"
                />
              </div>

              {dashboardData.email.emailSettings ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-6 h-6 text-teal-400" />
                      <h3 className="text-lg font-semibold text-white">Email AI Active</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dashboardData.email.emailSettings?.ai_enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {dashboardData.email.emailSettings?.ai_enabled ? 'Configured' : 'Default'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/email'}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Manage Email Conversations
                    </button>
                    <button
                      onClick={() => window.location.href = '/email/manage-templates'}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Manage Templates
                    </button>
                    <button
                      onClick={() => window.location.href = '/email/settings'}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Email AI Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">Email AI Not Configured</h4>
                  <p className="text-gray-400 mb-6">Set up your email integration to start using AI-powered email responses.</p>
                  <button
                    onClick={() => window.location.href = '/email/setup'}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Setup Email AI
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NEW: Facebook Tab */}
          {activeTab === 'facebook' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  icon={MessageCircle}
                  title="FB Conversations"
                  value={dashboardData.facebook.totalConversations}
                  color="blue"
                />
                <StatCard
                  icon={Send}
                  title="Messages Sent"
                  value={dashboardData.facebook.totalMessages}
                  color="green"
                />
                <StatCard
                  icon={Target}
                  title="Leads Generated"
                  value={dashboardData.facebook.leadsGenerated}
                  color="orange"
                />
                <StatCard
                  icon={Users}
                  title="Connected Pages"
                  value={dashboardData.facebook.connectedPages.length}
                  color="purple"
                />
              </div>

              {dashboardData.facebook.facebookSettings ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="w-6 h-6 text-blue-300" />
                      <h3 className="text-lg font-semibold text-white">Facebook Messenger AI Active</h3>
                    </div>
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      Connected
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/facebook-dashboard'}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Manage Facebook Conversations
                    </button>
                    <button
                      onClick={() => window.location.href = '/facebook/settings'}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Facebook AI Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold text-white mb-2">Facebook Messenger AI Not Connected</h4>
                  <p className="text-gray-400 mb-6">Connect your Facebook page to start using AI-powered messenger responses.</p>
                  <button
                    onClick={() => window.location.href = '/facebook-setup'}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Setup Facebook AI
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Account Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Account Plan</h4>
                      <p className="text-gray-400 text-sm">Pro Plan - All features included</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-medium">Pro</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">AI Configuration</h4>
                      <p className="text-gray-400 text-sm">Customize AI personality and responses</p>
                    </div>
                    <button
                      onClick={() => window.location.href = '/ai-config'}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
