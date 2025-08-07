'use client';

import { useState, useEffect } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
// REMOVED: import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { 
  Users, MessageCircle, TrendingUp, Zap, Phone, Mail, 
  Calendar, BarChart3, DollarSign, Clock, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Star, Shield,
  Crown, CheckCircle, AlertTriangle, Settings, RefreshCw,
  Send, FileText, Bot, Inbox, AlertCircle, ChevronRight, Info
} from 'lucide-react';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Enhanced state structure with social media data
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
    // Facebook Data
    facebook: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      postsManaged: 0,
      aiResponseRate: 0,
      pageConnected: false,
      lastSync: null
    },
    // Instagram Data
    instagram: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      postsManaged: 0,
      aiResponseRate: 0,
      accountConnected: false,
      lastSync: null
    },
    // Combined Stats
    combined: {
      totalLeads: 0,
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0,
      totalSocialPosts: 0
    }
  });

  // Tab configuration with social media tabs AND ANALYTICS
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'analytics', label: 'AI Analytics', icon: Activity }, // ADD THIS TAB
    { id: 'webchat', label: 'Web Chat', icon: MessageCircle },
    { id: 'sms', label: 'SMS', icon: Phone },
    { id: 'email', label: 'Email AI', icon: Mail },
    { id: 'facebook', label: 'Facebook', icon: Users },
    { id: 'instagram', label: 'Instagram', icon: Star },
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
      setError('');
      
      // 1. Load Web Chat data
      const webChatResponse = await fetch('/api/chat?action=conversations');
      const webChatData = await webChatResponse.json();
      
      // 2. Check AI connection status
      const aiStatusResponse = await fetch('/api/chat?action=test-connection');
      const aiStatusData = await aiStatusResponse.json();
      
      // 3. Load SMS data
      const smsResponse = await fetch('/api/sms/conversations');
      const smsData = await smsResponse.json();
      
      // 4. Load Email data (with error handling)
      let emailConversations = [];
      let emailMessages = 0;
      let emailLeads = 0;
      let emailHotLeadsToday = 0;
      let aiResponseRate = 0;
      let emailSettingsData = { settings: null };
      let emailTemplatesData = { templates: [] };
      
      try {
        const emailResponse = await fetch('/api/customer/email-conversations');
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          emailConversations = emailData.conversations || [];
        }
      } catch (emailError) {
        console.log('Email conversations not available:', emailError.message);
      }
      
      try {
        const emailSettingsResponse = await fetch('/api/customer/email-settings');
        if (emailSettingsResponse.ok) {
          emailSettingsData = await emailSettingsResponse.json();
        }
      } catch (settingsError) {
        console.log('Email settings not available:', settingsError.message);
      }
      
      try {
        const emailTemplatesResponse = await fetch('/api/customer/email-templates');
        if (emailTemplatesResponse.ok) {
          emailTemplatesData = await emailTemplatesResponse.json();
        }
      } catch (templatesError) {
        console.log('Email templates not available:', templatesError.message);
      }
      
      // Process email data
      emailMessages = emailConversations.reduce((acc, conv) => acc + (conv.messageCount || 0), 0);
      emailLeads = emailConversations.filter(conv => conv.status === 'lead').length;
      
      const today = new Date().toDateString();
      emailHotLeadsToday = emailConversations.filter(conv => {
        return conv.lastMessageAt && new Date(conv.lastMessageAt).toDateString() === today;
      }).length;
      
      // Calculate AI response rate
      const totalEmailsToday = emailConversations.filter(conv => {
        return conv.createdAt && new Date(conv.createdAt).toDateString() === today;
      }).length;
      aiResponseRate = totalEmailsToday > 0 ? Math.round((emailHotLeadsToday / totalEmailsToday) * 100) : 0;
      
      // 5. Load Facebook data (with error handling)
      let facebookData = {
        conversations: [],
        totalConversations: 0,
        totalMessages: 0,
        leadsGenerated: 0,
        postsManaged: 0,
        aiResponseRate: 0,
        pageConnected: false,
        lastSync: null
      };
      
      try {
        const fbResponse = await fetch('/api/social/facebook/stats');
        if (fbResponse.ok) {
          const fbStats = await fbResponse.json();
          facebookData = {
            conversations: fbStats.conversations || [],
            totalConversations: fbStats.totalConversations || 0,
            totalMessages: fbStats.totalMessages || 0,
            leadsGenerated: fbStats.leadsGenerated || 0,
            postsManaged: fbStats.postsManaged || 0,
            aiResponseRate: fbStats.aiResponseRate || 0,
            pageConnected: fbStats.pageConnected || false,
            lastSync: fbStats.lastSync
          };
        }
      } catch (fbError) {
        console.log('Facebook data not available:', fbError.message);
      }
      
      // 6. Load Instagram data (with error handling)  
      let instagramData = {
        conversations: [],
        totalConversations: 0,
        totalMessages: 0,
        leadsGenerated: 0,
        postsManaged: 0,
        aiResponseRate: 0,
        accountConnected: false,
        lastSync: null
      };
      
      try {
        const igResponse = await fetch('/api/social/instagram/stats');
        if (igResponse.ok) {
          const igStats = await igResponse.json();
          instagramData = {
            conversations: igStats.conversations || [],
            totalConversations: igStats.totalConversations || 0,
            totalMessages: igStats.totalMessages || 0,
            leadsGenerated: igStats.leadsGenerated || 0,
            postsManaged: igStats.postsManaged || 0,
            aiResponseRate: igStats.aiResponseRate || 0,
            accountConnected: igStats.accountConnected || false,
            lastSync: igStats.lastSync
          };
        }
      } catch (igError) {
        console.log('Instagram data not available:', igError.message);
      }
      
      // 7. Structure the data
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
        totalLeads: webChat.leadsGenerated + sms.leadsGenerated + email.leadsGenerated + facebookData.leadsGenerated + instagramData.leadsGenerated,
        totalConversations: webChat.totalConversations + sms.totalConversations + email.totalConversations + facebookData.totalConversations + instagramData.totalConversations,
        totalMessages: webChat.totalMessages + sms.totalMessages + email.totalMessages + facebookData.totalMessages + instagramData.totalMessages,
        hotLeadsToday: sms.hotLeadStats.alertsLast24h + email.hotLeadsToday,
        totalSocialPosts: facebookData.postsManaged + instagramData.postsManaged
      };

      setDashboardData({ webChat, sms, email, facebook: facebookData, instagram: instagramData, combined });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Utility component for stat cards
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = 'blue' }) => {
    const getColorClasses = (colorName) => {
      const colors = {
        blue: {
          bg: 'from-blue-500/20 to-purple-500/20',
          iconBg: 'from-blue-500/20 to-purple-500/20',
          iconColor: 'text-blue-400'
        },
        green: {
          bg: 'from-green-500/20 to-emerald-500/20',
          iconBg: 'from-green-500/20 to-emerald-500/20',
          iconColor: 'text-green-400'
        },
        orange: {
          bg: 'from-orange-500/20 to-red-500/20',
          iconBg: 'from-orange-500/20 to-red-500/20',
          iconColor: 'text-orange-400'
        },
        purple: {
          bg: 'from-purple-500/20 to-pink-500/20',
          iconBg: 'from-purple-500/20 to-pink-500/20',
          iconColor: 'text-purple-400'
        },
        teal: {
          bg: 'from-teal-500/20 to-cyan-500/20',
          iconBg: 'from-teal-500/20 to-cyan-500/20',
          iconColor: 'text-teal-400'
        }
      };
      return colors[colorName] || colors.blue;
    };

    const colorClasses = getColorClasses(color);

    return (
      <div className={`relative overflow-hidden rounded-2xl border border-white/20 p-6 backdrop-blur-lg bg-gradient-to-br ${colorClasses.bg}`}>
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses.iconBg}`}>
            <Icon className={`w-6 h-6 ${colorClasses.iconColor}`} />
          </div>
          {trend && (
            <div className="flex items-center space-x-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">+{trend}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-white">{value?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-300 font-medium">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Bizzy Bot AI</h1>
                  <p className="text-sm text-gray-300">Welcome back, {user?.firstName || 'User'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  dashboardData.webChat.aiStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="text-gray-300">
                  AI Status: {dashboardData.webChat.aiStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <SignOutButton>
                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition-colors">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-1 flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
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
                subtitle="All channels + Social"
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

            {/* NEW: AI Analytics Quick View */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Activity className="w-8 h-8 text-purple-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Performance Analytics</h3>
                    <p className="text-sm text-gray-300">Track real AI behaviors across all channels</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  View Full Analytics
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">0</div>
                  <div className="text-sm text-gray-300">Phone Requests Today</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-400">0</div>
                  <div className="text-sm text-gray-300">Hot Leads This Month</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">0</div>
                  <div className="text-sm text-gray-300">Appointments Scheduled</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">$0</div>
                  <div className="text-sm text-gray-300">Est. Business Value</div>
                </div>
              </div>
            </div>

            {/* Channel Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
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
                    {dashboardData.sms.phoneNumbers.length > 0 ? 'Active' : 'Setup Needed'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phone Numbers</span>
                    <span className="text-white font-medium">{dashboardData.sms.phoneNumbers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hot Leads</span>
                    <span className="text-orange-400 font-medium">{dashboardData.sms.hotLeadStats.totalHotLeads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Alerts (24h)</span>
                    <span className="text-red-400 font-medium">{dashboardData.sms.hotLeadStats.alertsLast24h}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/customer-sms-dashboard'}
                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage SMS
                </button>
              </div>

              {/* Email Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Email AI</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dashboardData.email.emailSettings 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.email.emailSettings ? 'Active' : 'Setup Needed'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversations</span>
                    <span className="text-white font-medium">{dashboardData.email.totalConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hot Leads Today</span>
                    <span className="text-purple-400 font-medium">{dashboardData.email.hotLeadsToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Response Rate</span>
                    <span className="text-green-400 font-medium">{dashboardData.email.aiResponseRate}%</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email'}
                  className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Email
                </button>
              </div>

              {/* Facebook Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-white">Facebook AI</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dashboardData.facebook.pageConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.facebook.pageConnected ? 'Connected' : 'Setup Needed'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Messages</span>
                    <span className="text-white font-medium">{dashboardData.facebook.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Posts Managed</span>
                    <span className="text-blue-400 font-medium">{dashboardData.facebook.postsManaged}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leads Generated</span>
                    <span className="text-green-400 font-medium">{dashboardData.facebook.leadsGenerated}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/social/facebook'}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Facebook
                </button>
              </div>

              {/* Instagram Status */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Star className="w-6 h-6 text-pink-400" />
                    <h3 className="text-lg font-semibold text-white">Instagram AI</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dashboardData.instagram.accountConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.instagram.accountConnected ? 'Connected' : 'Setup Needed'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Messages</span>
                    <span className="text-white font-medium">{dashboardData.instagram.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Posts Managed</span>
                    <span className="text-pink-400 font-medium">{dashboardData.instagram.postsManaged}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Leads Generated</span>
                    <span className="text-green-400 font-medium">{dashboardData.instagram.leadsGenerated}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/social/instagram'}
                  className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Instagram
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <button
                  onClick={() => window.location.href = '/demo'}
                  className="flex flex-col items-center space-y-2 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 transition-colors"
                >
                  <MessageCircle className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-white">Test Chat</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/customer-sms-dashboard'}
                  className="flex flex-col items-center space-y-2 p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors"
                >
                  <Phone className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-white">SMS Setup</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="flex flex-col items-center space-y-2 p-4 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 transition-colors"
                >
                  <Bot className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-white">AI Config</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/social/facebook'}
                  className="flex flex-col items-center space-y-2 p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-600/30 transition-colors"
                >
                  <Users className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-white">Facebook</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/social/instagram'}
                  className="flex flex-col items-center space-y-2 p-4 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg border border-pink-500/30 transition-colors"
                >
                  <Star className="w-6 h-6 text-pink-400" />
                  <span className="text-sm text-white">Instagram</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/email'}
                  className="flex flex-col items-center space-y-2 p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <Inbox className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-white">Email Inbox</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPDATED: Analytics Tab - Now Links to Dedicated Page */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-12">
              <div className="text-center max-w-2xl mx-auto">
                <Activity className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-4">AI Analytics Dashboard</h2>
                <p className="text-gray-300 mb-8">
                  Track your AI&apos;s behavior patterns, measure effectiveness, and understand the business value generated across all channels.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white/5 rounded-xl p-4">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <h3 className="text-white font-medium">Effectiveness Score</h3>
                    <p className="text-gray-400 text-sm">Measure AI performance</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <DollarSign className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <h3 className="text-white font-medium">Business Value</h3>
                    <p className="text-gray-400 text-sm">Track ROI & revenue impact</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <BarChart3 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <h3 className="text-white font-medium">Behavior Tracking</h3>
                    <p className="text-gray-400 text-sm">See what AI actually does</p>
                  </div>
                </div>

                <button
                  onClick={() => window.location.href = '/analytics'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-lg font-medium transition-all transform hover:scale-105"
                >
                  Open Analytics Dashboard
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-blue-400 font-medium mb-1">Event-Based Analytics</p>
                      <p className="text-gray-300 text-sm">
                        Analytics tracks actual AI behaviors instead of predicted settings. Every interaction is analyzed for phone requests, appointments, hot leads, and more.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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

        {/* Email Tab */}
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
                icon={Target}
                title="Hot Leads Today"
                value={dashboardData.email.hotLeadsToday}
                color="orange"
              />
              <StatCard
                icon={Activity}
                title="AI Response Rate"
                value={dashboardData.email.aiResponseRate}
                subtitle="%"
                color="green"
              />
              <StatCard
                icon={FileText}
                title="Templates"
                value={dashboardData.email.templates.length}
                color="blue"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Email AI Management</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    dashboardData.email.emailSettings 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.email.emailSettings ? 'Email AI Active' : 'Setup Required'}
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/email'}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Manage Email AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Facebook Tab */}
        {activeTab === 'facebook' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                title="Facebook Messages"
                value={dashboardData.facebook.totalMessages}
                color="blue"
              />
              <StatCard
                icon={MessageCircle}
                title="Conversations"
                value={dashboardData.facebook.totalConversations}
                color="green"
              />
              <StatCard
                icon={Target}
                title="Posts Managed"
                value={dashboardData.facebook.postsManaged}
                color="purple"
              />
              <StatCard
                icon={Star}
                title="Leads Generated"
                value={dashboardData.facebook.leadsGenerated}
                color="orange"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Facebook AI Management</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    dashboardData.facebook.pageConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.facebook.pageConnected ? 'Facebook Page Connected' : 'Page Setup Required'}
                  </div>
                  {dashboardData.facebook.lastSync && (
                    <span className="text-gray-400 text-sm">
                      Last sync: {new Date(dashboardData.facebook.lastSync).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => window.location.href = '/social/facebook'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Manage Facebook AI
                  </button>
                  <button
                    onClick={() => window.location.href = '/social/facebook/setup'}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-6 py-3 rounded-lg font-medium border border-blue-500/30 transition-colors"
                  >
                    Facebook Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instagram Tab */}
        {activeTab === 'instagram' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                icon={Star}
                title="Instagram Messages"
                value={dashboardData.instagram.totalMessages}
                color="purple"
              />
              <StatCard
                icon={MessageCircle}
                title="Conversations"
                value={dashboardData.instagram.totalConversations}
                color="blue"
              />
              <StatCard
                icon={Target}
                title="Posts Managed"
                value={dashboardData.instagram.postsManaged}
                color="orange"
              />
              <StatCard
                icon={Users}
                title="Leads Generated"
                value={dashboardData.instagram.leadsGenerated}
                color="green"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Instagram AI Management</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    dashboardData.instagram.accountConnected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {dashboardData.instagram.accountConnected ? 'Instagram Account Connected' : 'Account Setup Required'}
                  </div>
                  {dashboardData.instagram.lastSync && (
                    <span className="text-gray-400 text-sm">
                      Last sync: {new Date(dashboardData.instagram.lastSync).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => window.location.href = '/social/instagram'}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Manage Instagram AI
                  </button>
                  <button
                    onClick={() => window.location.href = '/social/instagram/setup'}
                    className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 px-6 py-3 rounded-lg font-medium border border-pink-500/30 transition-colors"
                  >
                    Instagram Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">AI Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/ai-config'}
                  className="flex items-center space-x-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 transition-colors"
                >
                  <Bot className="w-6 h-6 text-blue-400" />
                  <div className="text-left">
                    <div className="text-white font-medium">AI Settings</div>
                    <div className="text-sm text-gray-400">Configure AI behavior and responses</div>
                  </div>
                </button>
                
                <button
                  onClick={() => window.location.href = '/test-ai'}
                  className="flex items-center space-x-3 p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors"
                >
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div className="text-left">
                    <div className="text-white font-medium">Test AI Connection</div>
                    <div className="text-sm text-gray-400">Verify OpenAI integration</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-500/20 rounded-lg">
                  <div>
                    <div className="text-white font-medium">User Account</div>
                    <div className="text-sm text-gray-400">{user?.emailAddresses?.[0]?.emailAddress}</div>
                  </div>
                  <div className="text-sm text-green-400">Active</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
