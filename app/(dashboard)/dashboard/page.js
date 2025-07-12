'use client';

import { useState, useEffect } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { 
  Users, MessageCircle, TrendingUp, Zap, Phone, Mail, 
  Calendar, BarChart3, DollarSign, Clock, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Star, Shield,
  Crown, CheckCircle, AlertTriangle, Settings, RefreshCw,
  Send, FileText, Bot, Inbox, AlertCircle, Camera, Facebook
} from 'lucide-react';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Enhanced state structure with email data and social media
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
    // NEW: Social Media Data
    social: {
      facebook: {
        configured: false,
        conversations: [],
        totalConversations: 0,
        responseRate: 0,
        lastSync: null
      },
      instagram: {
        configured: false,
        conversations: [],
        totalConversations: 0,
        responseRate: 0,
        lastSync: null
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

  // Tab configuration with social media tab
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'webchat', label: 'Web Chat', icon: MessageCircle },
    { id: 'sms', label: 'SMS', icon: Phone },
    { id: 'email', label: 'Email AI', icon: Mail },
    { id: 'social', label: 'Social Media', icon: Users }, // NEW SOCIAL TAB
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

      // Load Email data
      const emailResponse = await fetch('/api/email/conversations');
      const emailData = await emailResponse.json();

      const emailSettingsResponse = await fetch('/api/email/settings');
      const emailSettingsData = await emailSettingsResponse.json();

      const emailTemplatesResponse = await fetch('/api/email/templates');
      const emailTemplatesData = await emailTemplatesResponse.json();

      // NEW: Load Social Media data
      const facebookResponse = await fetch('/api/facebook/status');
      const facebookData = await facebookResponse.json();

      const instagramResponse = await fetch('/api/instagram/status');
      const instagramData = await instagramResponse.json();

      // Process email data
      const emailConversations = emailData.conversations || [];
      const emailMessages = emailConversations.reduce((total, conv) => total + (conv.messages?.length || 0), 0);
      const emailLeads = emailConversations.filter(conv => conv.isLead).length;
      const emailHotLeadsToday = emailConversations.filter(conv => {
        const today = new Date().toDateString();
        return conv.hotLead && new Date(conv.updatedAt).toDateString() === today;
      }).length;
      
      const totalEmailsToday = emailConversations.filter(conv => {
        const today = new Date().toDateString();
        return new Date(conv.updatedAt).toDateString() === today;
      }).length;
      
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

      // NEW: Social media data structure
      const social = {
        facebook: {
          configured: facebookData.configured || false,
          conversations: facebookData.conversations || [],
          totalConversations: facebookData.conversationsToday || 0,
          responseRate: facebookData.responseRate || 0,
          lastSync: facebookData.lastUpdated
        },
        instagram: {
          configured: instagramData.configured || false,
          conversations: instagramData.conversations || [],
          totalConversations: instagramData.conversationsToday || 0,
          responseRate: instagramData.responseRate || 0,
          lastSync: instagramData.lastUpdated
        }
      };

      const combined = {
        totalLeads: webChat.leadsGenerated + sms.leadsGenerated + email.leadsGenerated,
        totalConversations: webChat.totalConversations + sms.totalConversations + email.totalConversations + social.facebook.totalConversations + social.instagram.totalConversations,
        totalMessages: webChat.totalMessages + sms.totalMessages + email.totalMessages,
        hotLeadsToday: sms.hotLeadStats.alertsLast24h + email.hotLeadsToday
      };

      setDashboardData({ webChat, sms, email, social, combined });
      setError('');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
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
      color === 'pink' ? 'from-pink-500/20 to-rose-500/20' :
      'from-gray-500/20 to-slate-500/20'
    }`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${
          color === 'blue' ? 'from-blue-500/20 to-purple-500/20' :
          color === 'green' ? 'from-green-500/20 to-emerald-500/20' :
          color === 'orange' ? 'from-orange-500/20 to-red-500/20' :
          color === 'purple' ? 'from-purple-500/20 to-pink-500/20' :
          color === 'teal' ? 'from-teal-500/20 to-cyan-500/20' :
          color === 'pink' ? 'from-pink-500/20 to-rose-500/20' :
          'from-gray-500/20 to-slate-500/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-400' :
            color === 'green' ? 'text-green-400' :
            color === 'orange' ? 'text-orange-400' :
            color === 'purple' ? 'text-purple-400' :
            color === 'teal' ? 'text-teal-400' :
            color === 'pink' ? 'text-pink-400' :
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
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">AI Business Dashboard</h1>
                  <p className="text-gray-400 text-sm">Intelligent automation platform</p>
                </div>
              </div>
            </div>

            {isLoaded && user && (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-3 bg-white/10 rounded-xl px-4 py-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {user.firstName || 'User'}
                    </p>
                    <p className="text-gray-400 text-xs">Premium Plan</p>
                  </div>
                </div>
                <SignOutButton>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Crown className="w-4 h-4" />
                  </button>
                </SignOutButton>
              </div>
            )}
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
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
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
                subtitle="Web + SMS + Email + Social"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
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
                    {dashboardData.webChat.aiStatus === 'connected' ? 'Active' : 'Offline'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversations</span>
                    <span className="text-white font-medium">{dashboardData.webChat.totalConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Messages</span>
                    <span className="text-white font-medium">{dashboardData.webChat.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leads Generated</span>
                    <span className="text-green-400 font-medium">{dashboardData.webChat.leadsGenerated}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Web Chat
                </button>
              </div>

              {/* SMS Status */}
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

              {/* EMAIL AI Status */}
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
                    {dashboardData.email.emailSettings?.ai_enabled ? 'Active' : 'Setup Required'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversations</span>
                    <span className="text-white font-medium">{dashboardData.email.totalConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hot Leads Today</span>
                    <span className="text-orange-400 font-medium">{dashboardData.email.hotLeadsToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Response Rate</span>
                    <span className="text-teal-400 font-medium">{dashboardData.email.aiResponseRate}%</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email'}
                  className="w-full mt-4 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Email AI
                </button>
              </div>

              {/* NEW: Social Media Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Social Media</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (dashboardData.social.facebook.configured || dashboardData.social.instagram.configured)
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {(dashboardData.social.facebook.configured || dashboardData.social.instagram.configured) ? 'Active' : 'Setup Required'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Facebook</span>
                    <span className={`font-medium ${dashboardData.social.facebook.configured ? 'text-blue-400' : 'text-gray-500'}`}>
                      {dashboardData.social.facebook.configured ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Instagram</span>
                    <span className={`font-medium ${dashboardData.social.instagram.configured ? 'text-pink-400' : 'text-gray-500'}`}>
                      {dashboardData.social.instagram.configured ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Messages</span>
                    <span className="text-purple-400 font-medium">
                      {dashboardData.social.facebook.totalConversations + dashboardData.social.instagram.totalConversations}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('social')}
                  className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Social Media
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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

                <button
                  onClick={() => window.location.href = '/facebook-setup'}
                  className="flex flex-col items-center space-y-2 p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-600/30 transition-colors"
                >
                  <Facebook className="w-6 h-6 text-blue-500" />
                  <span className="text-sm text-white">Setup Facebook</span>
                </button>

                <button
                  onClick={() => window.location.href = '/instagram-setup'}
                  className="flex flex-col items-center space-y-2 p-4 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg border border-pink-500/30 transition-colors"
                >
                  <Camera className="w-6 h-6 text-pink-400" />
                  <span className="text-sm text-white">Setup Instagram</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="flex flex-col items-center space-y-2 p-4 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 transition-colors"
                >
                  <Bot className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-white">AI Config</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/email'}
                  className="flex flex-col items-center space-y-2 p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <Inbox className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-white">Email Inbox</span>
                </button>

                <button
                  onClick={() => window.location.href = '/analytics'}
                  className="flex flex-col items-center space-y-2 p-4 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg border border-indigo-500/30 transition-colors"
                >
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm text-white">Analytics</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Social Media Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facebook Integration */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Facebook className="w-8 h-8 text-blue-500 mr-3" />
                    <div>
                      <h3 className="text-xl font-semibold text-white">Facebook Messenger</h3>
                      <p className="text-gray-300 text-sm">AI-powered Facebook messaging</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dashboardData.social.facebook.configured 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.social.facebook.configured ? 'Active' : 'Setup Required'}
                  </div>
                </div>

                {dashboardData.social.facebook.configured ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Conversations Today</span>
                        <span className="text-white font-medium">{dashboardData.social.facebook.totalConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Response Rate</span>
                        <span className="text-blue-400 font-medium">{dashboardData.social.facebook.responseRate}%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={() => window.location.href = '/facebook-dashboard'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Manage Facebook Messages
                      </button>
                      <button
                        onClick={() => window.location.href = '/facebook-setup'}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Facebook Settings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Facebook className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-semibold text-white mb-2">Facebook Not Connected</h4>
                    <p className="text-gray-400 mb-6">Connect your Facebook page to enable AI-powered messaging.</p>
                    <button
                      onClick={() => window.location.href = '/facebook-setup'}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Setup Facebook Messenger
                    </button>
                  </div>
                )}
              </div>

              {/* Instagram Integration */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Camera className="w-8 h-8 text-pink-400 mr-3" />
                    <div>
                      <h3 className="text-xl font-semibold text-white">Instagram Direct</h3>
                      <p className="text-gray-300 text-sm">AI-powered Instagram messaging</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dashboardData.social.instagram.configured 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.social.instagram.configured ? 'Active' : 'Setup Required'}
                  </div>
                </div>

                {dashboardData.social.instagram.configured ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Conversations Today</span>
                        <span className="text-white font-medium">{dashboardData.social.instagram.totalConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Response Rate</span>
                        <span className="text-pink-400 font-medium">{dashboardData.social.instagram.responseRate}%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={() => window.location.href = '/instagram-dashboard'}
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Manage Instagram Messages
                      </button>
                      <button
                        onClick={() => window.location.href = '/instagram-setup'}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Instagram Settings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="w-16 h-16 text-pink-400 mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-semibold text-white mb-2">Instagram Not Connected</h4>
                    <p className="text-gray-400 mb-6">Connect your Instagram account to enable AI-powered direct messaging.</p>
                    <button
                      onClick={() => window.location.href = '/instagram-setup'}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Setup Instagram Direct
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={Facebook}
                title="Facebook Messages"
                value={dashboardData.social.facebook.totalConversations}
                color="blue"
              />
              <StatCard
                icon={Camera}
                title="Instagram Messages"
                value={dashboardData.social.instagram.totalConversations}
                color="pink"
              />
              <StatCard
                icon={Target}
                title="Social Media Leads"
                value="0"
                color="orange"
              />
              <StatCard
                icon={Activity}
                title="Combined Response Rate"
                value={Math.round((dashboardData.social.facebook.responseRate + dashboardData.social.instagram.responseRate) / 2) || 0}
                color="green"
              />
            </div>
          </div>
        )}

        {/* Web Chat Tab */}
        {activeTab === 'webchat' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={MessageCircle}
                title="Conversations"
                value={dashboardData.webChat.totalConversations}
                color="blue"
              />
              <StatCard
                icon={Activity}
                title="Messages"
                value={dashboardData.webChat.totalMessages}
                color="green"
              />
              <StatCard
                icon={Users}
                title="Leads"
                value={dashboardData.webChat.leadsGenerated}
                color="purple"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Web Chat AI Status</h3>
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-lg ${
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

        {/* EMAIL Tab */}
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
                icon={Target}
                title="Hot Leads Today"
                value={dashboardData.email.hotLeadsToday}
                color="orange"
              />
              <StatCard
                icon={Bot}
                title="AI Response Rate"
                value={`${dashboardData.email.aiResponseRate}%`}
                color="purple"
              />
              <StatCard
                icon={FileText}
                title="Templates"
                value={dashboardData.email.templates.length}
                color="blue"
              />
            </div>

            {/* Email AI Status */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Email AI Configuration</h3>
                <div className={`px-4 py-2 rounded-lg ${
                  dashboardData.email.emailSettings?.ai_enabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {dashboardData.email.emailSettings?.ai_enabled ? '✅ AI Enabled' : '⚠️ Setup Required'}
                </div>
              </div>
              
              {dashboardData.email.emailSettings?.ai_enabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI Model</span>
                      <span className="text-white">{dashboardData.email.emailSettings.ai_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Temperature</span>
                      <span className="text-white">{dashboardData.email.emailSettings.ai_temperature}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">System Prompt</span>
                      <span className="text-white">{dashboardData.email.emailSettings.ai_system_prompt ? 'Configured' : 'Default'}</span>
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

            {/* Email Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
                <Inbox className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">Email Inbox</h4>
                <p className="text-gray-400 text-sm mb-4">View and manage email conversations</p>
                <button
                  onClick={() => window.location.href = '/email'}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Open Inbox
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
                <FileText className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">Email Templates</h4>
                <p className="text-gray-400 text-sm mb-4">Create and manage email templates</p>
                <button
                  onClick={() => window.location.href = '/email/manage-templates'}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Templates
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 text-center">
                <Settings className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">Email AI Settings</h4>
                <p className="text-gray-400 text-sm mb-4">Configure AI email responses</p>
                <button
                  onClick={() => window.location.href = '/email/settings'}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  AI Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Account Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Profile Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                      <p className="text-white">{user?.firstName} {user?.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white">{user?.emailAddresses[0]?.emailAddress}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-white mb-4">Subscription</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Plan</label>
                      <p className="text-white">Premium Plan</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-sm">Active</span>
                    </div>
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
