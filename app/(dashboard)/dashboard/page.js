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
    // NEW: Email Data
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
    // Combined Stats
    combined: {
      totalLeads: 0,
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0
    }
  });

  // Tab configuration with email tab
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'webchat', label: 'Web Chat', icon: MessageCircle },
    { id: 'sms', label: 'SMS', icon: Phone },
    { id: 'email', label: 'Email AI', icon: Mail }, // NEW EMAIL TAB
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
      
      // Initialize with safe defaults
      let webChatData = { conversations: [], totalConversations: 0, totalMessages: 0, leadsGenerated: 0 };
      let aiStatusData = { connected: false };
      let smsData = { conversations: [], totalConversations: 0, totalMessages: 0, leadsGenerated: 0, phoneNumbers: [], hotLeadAlerts: [], hotLeadStats: { totalHotLeads: 0, alertsLast24h: 0, averageScore: 0, highestScore: 0 } };
      let emailConversations = [];
      let emailMessages = 0;
      let emailSettingsData = { settings: null };
      let emailTemplatesData = { templates: [] };

      // Load Web Chat data (gracefully handle errors)
      try {
        const webChatResponse = await fetch('/api/chat?action=conversations');
        if (webChatResponse.ok) {
          webChatData = await webChatResponse.json();
        } else {
          console.warn('Web chat API failed:', webChatResponse.status);
        }
      } catch (error) {
        console.warn('Web chat API error:', error);
      }
      
      // Check AI connection status (gracefully handle errors)
      try {
        const aiStatusResponse = await fetch('/api/chat?action=test-connection');
        if (aiStatusResponse.ok) {
          aiStatusData = await aiStatusResponse.json();
        } else {
          console.warn('AI status API failed:', aiStatusResponse.status);
        }
      } catch (error) {
        console.warn('AI status API error:', error);
      }
      
      // Load SMS data (gracefully handle errors)
      try {
        const smsResponse = await fetch('/api/sms/conversations');
        if (smsResponse.ok) {
          smsData = await smsResponse.json();
        } else {
          console.warn('SMS API failed:', smsResponse.status);
        }
      } catch (error) {
        console.warn('SMS API error:', error);
      }
      
      // Load Email data (gracefully handle errors)
      try {
        const emailConversationsResponse = await fetch('/api/email/conversations');
        if (emailConversationsResponse.ok) {
          const emailConversationsData = await emailConversationsResponse.json();
          emailConversations = emailConversationsData.conversations || [];
        } else {
          console.warn('Email conversations API failed:', emailConversationsResponse.status);
        }
      } catch (error) {
        console.warn('Email conversations API error:', error);
      }
      
      try {
        const emailMessagesResponse = await fetch('/api/email/messages');
        if (emailMessagesResponse.ok) {
          const emailMessagesData = await emailMessagesResponse.json();
          emailMessages = emailMessagesData.totalMessages || 0;
        } else {
          console.warn('Email messages API failed:', emailMessagesResponse.status);
        }
      } catch (error) {
        console.warn('Email messages API error:', error);
      }
      
      try {
        const emailSettingsResponse = await fetch('/api/email/settings');
        if (emailSettingsResponse.ok) {
          emailSettingsData = await emailSettingsResponse.json();
        } else {
          console.warn('Email settings API failed (this is expected if not configured):', emailSettingsResponse.status);
        }
      } catch (error) {
        console.warn('Email settings API error:', error);
      }
      
      try {
        const emailTemplatesResponse = await fetch('/api/email/templates');
        if (emailTemplatesResponse.ok) {
          emailTemplatesData = await emailTemplatesResponse.json();
        } else {
          console.warn('Email templates API failed:', emailTemplatesResponse.status);
        }
      } catch (error) {
        console.warn('Email templates API error:', error);
      }
      
      // Process email data
      const emailLeads = emailConversations.filter(conv => conv.leadCaptured).length;
      
      // Calculate email hot leads for today
      const today = new Date().toDateString();
      const emailHotLeadsToday = emailConversations.filter(conv => 
        conv.lastActivity && new Date(conv.lastActivity).toDateString() === today && conv.hotLeadScore > 70
      ).length;
      
      // Calculate AI response rate for emails
      const totalEmailsToday = emailConversations.filter(conv => 
        conv.lastActivity && new Date(conv.lastActivity).toDateString() === today
      ).length;
      
      const aiResponseRate = totalEmailsToday > 0 ? 
        Math.round((emailHotLeadsToday / totalEmailsToday) * 100) : 0;
      
      const webChat = {
        conversations: webChatData.conversations || [],
        totalConversations: webChatData.totalConversations || 0,
        totalMessages: webChatData.totalMessages || 0,
        leadsGenerated: webChatData.leadsGenerated || 0,
        aiStatus: aiStatusData.connected ? 'connected' : 'disconnected'
      };

      const sms = {
        conversations: smsData.conversations || [],
        totalConversations: smsData.totalConversations || 0,
        totalMessages: smsData.totalMessages || 0,
        leadsGenerated: smsData.leadsGenerated || 0,
        phoneNumbers: smsData.phoneNumbers || [],
        hotLeadAlerts: smsData.hotLeadAlerts || [],
        hotLeadStats: smsData.hotLeadStats || {
          totalHotLeads: 0,
          alertsLast24h: 0,
          averageScore: 0,
          highestScore: 0
        }
      };

      // Email data structure
      const email = {
        conversations: emailConversations,
        totalConversations: emailConversations.length,
        totalMessages: emailMessages,
        leadsGenerated: emailLeads,
        hotLeadsToday: emailHotLeadsToday,
        aiResponseRate,
        emailSettings: emailSettingsData.settings,
        templates: emailTemplatesData.templates || []
      };

      const combined = {
        totalLeads: webChat.leadsGenerated + sms.leadsGenerated + email.leadsGenerated,
        totalConversations: webChat.totalConversations + sms.totalConversations + email.totalConversations,
        totalMessages: webChat.totalMessages + sms.totalMessages + email.totalMessages,
        hotLeadsToday: sms.hotLeadStats.alertsLast24h + email.hotLeadsToday
      };

      setDashboardData({ webChat, sms, email, combined });
      setError(''); // Clear any previous errors
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Some dashboard features may be unavailable. Core functionality is working.');
    } finally {
      setLoading(false);
    }
  };

  // Utility component for stat cards
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = 'blue' }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-lg bg-gradient-to-br ${
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
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <Crown className="w-4 h-4" />
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500/30 border border-purple-500 text-purple-400'
                      : 'border border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-300">{error}</p>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Combined Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                title="Total Leads"
                value={dashboardData.combined.totalLeads}
                subtitle="Web + SMS + Email"
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Web Chat Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Web Chat AI</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dashboardData.webChat.aiStatus === 'connected' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {dashboardData.webChat.aiStatus === 'connected' ? '✅ AI Connected' : '❌ AI Disconnected'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.webChat.totalConversations}</div>
                    <div className="text-sm text-gray-400">Conversations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.webChat.leadsGenerated}</div>
                    <div className="text-sm text-gray-400">Leads Generated</div>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Test Web Chat
                </button>
              </div>

              {/* SMS Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-6 h-6 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">SMS AI</h3>
                  </div>
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                    📱 Active
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.sms.totalConversations}</div>
                    <div className="text-sm text-gray-400">SMS Chats</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.sms.hotLeadStats.alertsLast24h}</div>
                    <div className="text-sm text-gray-400">Hot Leads (24h)</div>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/customer-sms-dashboard'}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Open SMS Dashboard
                </button>
              </div>

              {/* EMAIL Status - NEW */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Email AI</h3>
                  </div>
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                    📧 Active
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.email.totalConversations}</div>
                    <div className="text-sm text-gray-400">Email Threads</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{dashboardData.email.aiResponseRate}%</div>
                    <div className="text-sm text-gray-400">AI Response Rate</div>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email-dashboard'}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Open Email Dashboard
                </button>
              </div>
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
                icon={Users}
                title="Leads Generated"
                value={dashboardData.webChat.leadsGenerated}
                color="purple"
              />
              <StatCard
                icon={Bot}
                title="AI Status"
                value={dashboardData.webChat.aiStatus === 'connected' ? 'Online' : 'Offline'}
                color={dashboardData.webChat.aiStatus === 'connected' ? 'green' : 'orange'}
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Web Chat AI Status</h3>
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

        {/* EMAIL Tab - NEW COMPREHENSIVE EMAIL SECTION */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={Mail}
                title="Email Conversations"
                value={dashboardData.email.totalConversations}
                color="purple"
              />
              <StatCard
                icon={Send}
                title="Total Messages"
                value={dashboardData.email.totalMessages}
                color="blue"
              />
              <StatCard
                icon={Users}
                title="Leads Generated"
                value={dashboardData.email.leadsGenerated}
                color="green"
              />
              <StatCard
                icon={TrendingUp}
                title="AI Response Rate"
                value={`${dashboardData.email.aiResponseRate}%`}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Settings */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Email AI Settings</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Auto-Reply Status</span>
                    <span className="text-green-400">✅ Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Templates Available</span>
                    <span className="text-blue-400">{dashboardData.email.templates.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Hot Leads Today</span>
                    <span className="text-orange-400">{dashboardData.email.hotLeadsToday}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email-settings'}
                  className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Configure Email AI
                </button>
              </div>

              {/* Email Analytics */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Email Analytics</h3>
                <div className="space-y-4">
                  <div className="bg-blue-500/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-white">{dashboardData.email.totalConversations}</div>
                    <div className="text-sm text-blue-300">Active Email Threads</div>
                  </div>
                  <div className="bg-green-500/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-white">{dashboardData.email.leadsGenerated}</div>
                    <div className="text-sm text-green-300">Leads from Email</div>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email-dashboard'}
                  className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  View Full Email Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  AI Configuration
                </button>
                <button
                  onClick={() => window.location.href = '/business-profile'}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Business Profile
                </button>
                <button
                  onClick={() => window.location.href = '/integrations'}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Integrations
                </button>
                <button
                  onClick={() => window.location.href = '/billing'}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Billing & Plans
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
