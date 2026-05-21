'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Users, MessageCircle, TrendingUp, Zap, Phone, Mail, 
  Calendar, BarChart3, DollarSign, Clock, Target, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Star, Shield,
  Crown, CheckCircle, AlertTriangle, Settings, RefreshCw,
  Send, FileText, Bot, Inbox, AlertCircle, ChevronRight, Info,
  UserCheck, Sliders, Cpu
} from 'lucide-react';

export default function MainDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [activeAITab, setActiveAITab] = useState('email');
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    webChat: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      aiStatus: 'checking'
    },
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
    email: {
      conversations: [],
      totalConversations: 0,
      totalMessages: 0,
      leadsGenerated: 0,
      hotLeadsToday: 0,
      aiEngagementRate: 0,
      emailSettings: null,
      templates: []
    },
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
    combined: {
      totalLeads: 0,
      totalConversations: 0,
      totalMessages: 0,
      hotLeadsToday: 0,
      totalSocialPosts: 0
    },
    analytics: {
      phoneRequestsToday: 0,
      hotLeadsMonth: 0,
      hotLeadsToday: 0,
      appointmentsScheduled: 0,
      businessValue: 0,
      totalInteractions: 0,
      aiEngagementRate: 0,
      avgResponseTime: 0,
      leadsCapture: 0,
      effectiveness: 0
    }
  });

  const aiSettingsTabs = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'facebook', label: 'Facebook', icon: Users },
    { id: 'instagram', label: 'Instagram', icon: Star },
    { id: 'text', label: 'Text/SMS', icon: Phone },
    { id: 'chatbot', label: 'Chatbot', icon: MessageCircle }
  ];

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      // Note: we do NOT set initialLoad here — that only clears once in the finally block
      
      // Load Web Chat data
      let webChatData = { conversations: [], totalConversations: 0, totalMessages: 0, leadsGenerated: 0 };
      let aiStatusData = { connected: false };
      
      try {
        const webChatResponse = await fetch('/api/chat?action=conversations');
        if (webChatResponse.ok) {
          webChatData = await webChatResponse.json();
        }
      } catch (webChatError) {
        console.log('Web chat data not available:', webChatError.message);
      }
      
      try {
        const aiStatusResponse = await fetch('/api/chat?action=test-connection');
        if (aiStatusResponse.ok) {
          aiStatusData = await aiStatusResponse.json();
        }
      } catch (aiStatusError) {
        console.log('AI status check failed:', aiStatusError.message);
      }
      
      // Load SMS data
      let smsData = {
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
      };
      
      try {
        const smsResponse = await fetch('/api/sms/conversations');
        if (smsResponse.ok) {
          smsData = await smsResponse.json();
        }
      } catch (smsError) {
        console.log('SMS data not available:', smsError.message);
      }
      
      // Load Email data
      let emailConversations = [];
      let emailMessages = 0;
      let emailLeads = 0;
      let emailHotLeadsToday = 0;
      let aiEngagementRate = 0;
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

      try {
        const emailStatsResponse = await fetch('/api/customer/email-stats');
        if (emailStatsResponse.ok) {
          const emailStatsData = await emailStatsResponse.json();
          if (emailStatsData.success && emailStatsData.stats) {
            aiEngagementRate = emailStatsData.stats.aiEngagementRate || 0;
            emailHotLeadsToday = emailStatsData.stats.activeToday || 0;
          }
        }
      } catch (emailStatsError) {
        console.log('Email stats not available:', emailStatsError.message);
      }
      
      emailMessages = emailConversations.reduce((acc, conv) => acc + (conv.messageCount || 0), 0);
      emailLeads = emailConversations.filter(conv => conv.status === 'lead').length;

      // Load Analytics data
      let analyticsData = {
        phoneRequestsToday: 0,
        hotLeadsMonth: 0,
        hotLeadsToday: 0,
        appointmentsScheduled: 0,
        businessValue: 0,
        totalInteractions: 0,
        aiEngagementRate: 0,
        avgResponseTime: 0,
        leadsCapture: 0,
        effectiveness: 0
      };

      try {
        const analyticsResponse = await fetch('/api/customer/analytics?period=month');
        if (analyticsResponse.ok) {
          const analytics = await analyticsResponse.json();
          
          if (analytics.success && analytics.analytics) {
            analyticsData = {
              phoneRequestsToday: analytics.analytics.overview?.phone_requests_today || 0,
              hotLeadsMonth: analytics.analytics.overview?.hot_leads_month || 0,
              hotLeadsToday: analytics.analytics.overview?.hot_leads_today || 0,
              appointmentsScheduled: analytics.analytics.overview?.appointments_month || 0,
              businessValue: analytics.analytics.businessValue?.total || 0,
              totalInteractions: analytics.analytics.overview?.total_interactions_month || 0,
              aiEngagementRate: analytics.analytics.overview?.ai_engagement_rate || 0,
              avgResponseTime: analytics.analytics.overview?.avg_response_speed_minutes || 2,
              leadsCapture: analytics.analytics.overview?.total_leads_captured || 0,
              effectiveness: analytics.analytics.overview?.effectiveness_score || 0
            };
          }
        }
      } catch (analyticsError) {
        console.log('Analytics not available:', analyticsError.message);
      }
      
      // Load Facebook data
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
      
      // Load Instagram data 
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
      
      // Structure the data
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
        aiEngagementRate,
        emailSettings: emailSettingsData.settings,
        templates: emailTemplatesData.templates || []
      };

      const combined = {
        totalLeads: analyticsData.leadsCapture || (webChat.leadsGenerated + sms.leadsGenerated + email.leadsGenerated + facebookData.leadsGenerated + instagramData.leadsGenerated),
        totalConversations: analyticsData.totalInteractions || (webChat.totalConversations + sms.totalConversations + email.totalConversations + facebookData.totalConversations + instagramData.totalConversations),
        totalMessages: analyticsData.totalInteractions || (webChat.totalMessages + sms.totalMessages + email.totalMessages + facebookData.totalMessages + instagramData.totalMessages),
        hotLeadsToday: analyticsData.hotLeadsToday || (sms.hotLeadStats.alertsLast24h + email.hotLeadsToday),
        totalSocialPosts: facebookData.postsManaged + instagramData.postsManaged,
        analytics: analyticsData
      };

      setDashboardData({ 
        webChat, 
        sms, 
        email, 
        facebook: facebookData, 
        instagram: instagramData, 
        combined,
        analytics: analyticsData
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Stat Card Component
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
        },
        cyan: {
          bg: 'from-cyan-500/20 to-blue-500/20',
          iconBg: 'from-cyan-500/20 to-blue-500/20',
          iconColor: 'text-cyan-400'
        }
      };
      return colors[colorName] || colors.blue;
    };

    const colorClasses = getColorClasses(color);

    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-800 p-5 bg-[#161B22]">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className={`w-5 h-5 ${colorClasses.iconColor}`} />
          </div>
          {trend && (
            <div className="flex items-center space-x-1 text-xs">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-medium">+{trend}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-white">{value?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-400 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  };

  // AI Settings Component WITH ALL FIXES
  const AISettingsSection = () => {
    const [settingsData, setSettingsData] = useState({
      email: {
        businessName: '',
        industry: '',
        businessDescription: '',
        responseTone: 'Professional',
        responseLength: 'Short',
        knowledgeBase: '',
        customInstructions: ''
      },
      facebook: {
        businessName: '',
        industry: '',
        businessDescription: '',
        responseTone: 'Professional',
        responseLength: 'Short',
        knowledgeBase: '',
        customInstructions: '',
        autoRespondMessages: false,
        autoRespondComments: false
      },
      instagram: {
        businessName: '',
        industry: '',
        businessDescription: '',
        responseTone: 'Professional',
        responseLength: 'Short',
        knowledgeBase: '',
        customInstructions: '',
        autoRespondDMs: false,
        autoRespondComments: false
      },
      text: {
        businessName: '',
        industry: '',
        businessDescription: '',
        responseTone: 'Professional',
        responseLength: 'Short',
        knowledgeBase: '',
        customInstructions: '',
        enableAutoResponses: false,
        hotLeadDetection: false,
        responseDelay: ''
      },
      chatbot: {
        businessName: '',
        industry: '',
        businessDescription: '',
        responseTone: 'Professional',
        responseLength: 'Short',
        knowledgeBase: '',
        customInstructions: '',
        proactiveEngagement: false,
        collectContactInfo: false
      }
    });

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Load existing settings when component mounts
    useEffect(() => {
      loadAllSettings();
    }, []);

    const loadAllSettings = async () => {
      try {
        setLoadingSettings(true);
        const response = await fetch('/api/ai-settings');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.settings) {
            const updatedSettings = { ...settingsData };
            
            Object.keys(data.settings).forEach(channel => {
              if (data.settings[channel] && updatedSettings[channel]) {
                updatedSettings[channel] = {
                  ...updatedSettings[channel],
                  ...data.settings[channel]
                };
              }
            });
            
            setSettingsData(updatedSettings);
            console.log('✅ Loaded existing AI settings');
          }
        }
      } catch (error) {
        console.error('Error loading AI settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    const handleSaveSettings = async (channel) => {
      setSaving(true);
      setSaveMessage('');
      
      try {
        const response = await fetch('/api/ai-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channel,
            settings: settingsData[channel]
          })
        });

        if (response.ok) {
          setSaveMessage(`${channel.charAt(0).toUpperCase() + channel.slice(1)} settings saved successfully!`);
          setTimeout(() => setSaveMessage(''), 3000);
        } else {
          setSaveMessage('Failed to save settings. Please try again.');
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        setSaveMessage('Error saving settings. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    const updateSettings = (channel, field, value) => {
      setSettingsData(prev => ({
        ...prev,
        [channel]: {
          ...prev[channel],
          [field]: value
        }
      }));
    };

    if (loadingSettings) {
      return (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-white">Loading AI Settings...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-xl bg-violet-500/10">
            <Cpu className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Settings</h3>
            <p className="text-sm text-gray-300">Unified Gmail automation with smart AI responses and filtering</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2">
          {aiSettingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAITab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeAITab === tab.id
                  ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {activeAITab === 'email' && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData.email.businessName || ''}
                    onChange={(e) => updateSettings('email', 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData.email.industry || ''}
                    onChange={(e) => updateSettings('email', 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData.email.businessDescription || ''}
                    onChange={(e) => updateSettings('email', 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Communication Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData.email.responseTone || 'Professional'}
                      onChange={(e) => updateSettings('email', 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData.email.responseLength || 'Short'}
                      onChange={(e) => updateSettings('email', 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Business Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add specific information about your business that the AI should know
                </p>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={settingsData.email.knowledgeBase || ''}
                  onChange={(e) => updateSettings('email', 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Custom AI Instructions
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Tell the AI exactly how to behave and respond to customers
                </p>
                <textarea 
                  placeholder="Enter custom instructions for AI behavior..."
                  value={settingsData.email.customInstructions || ''}
                  onChange={(e) => updateSettings('email', 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <button 
                onClick={() => handleSaveSettings('email')}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Email Settings'}
              </button>
              {saveMessage && activeAITab === 'email' && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}

          {activeAITab === 'facebook' && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData.facebook.businessName || ''}
                    onChange={(e) => updateSettings('facebook', 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData.facebook.industry || ''}
                    onChange={(e) => updateSettings('facebook', 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData.facebook.businessDescription || ''}
                    onChange={(e) => updateSettings('facebook', 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  Communication Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData.facebook.responseTone || 'Professional'}
                      onChange={(e) => updateSettings('facebook', 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData.facebook.responseLength || 'Short'}
                      onChange={(e) => updateSettings('facebook', 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Business Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add specific information about your business that the AI should know
                </p>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={settingsData.facebook.knowledgeBase || ''}
                  onChange={(e) => updateSettings('facebook', 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-400" />
                  Custom AI Instructions
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Tell the AI exactly how to behave and respond to customers
                </p>
                <textarea 
                  placeholder="Enter custom instructions for AI behavior..."
                  value={settingsData.facebook.customInstructions || ''}
                  onChange={(e) => updateSettings('facebook', 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Facebook AI Configuration
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Configure AI for Facebook Messenger and post responses
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-respond to messages</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.facebook.autoRespondMessages || false}
                        onChange={(e) => updateSettings('facebook', 'autoRespondMessages', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-respond to comments</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.facebook.autoRespondComments || false}
                        onChange={(e) => updateSettings('facebook', 'autoRespondComments', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSaveSettings('facebook')}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Facebook Settings'}
              </button>
              {saveMessage && activeAITab === 'facebook' && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}

          {activeAITab === 'instagram' && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-pink-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData.instagram.businessName || ''}
                    onChange={(e) => updateSettings('instagram', 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData.instagram.industry || ''}
                    onChange={(e) => updateSettings('instagram', 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData.instagram.businessDescription || ''}
                    onChange={(e) => updateSettings('instagram', 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-pink-400" />
                  Communication Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData.instagram.responseTone || 'Professional'}
                      onChange={(e) => updateSettings('instagram', 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData.instagram.responseLength || 'Short'}
                      onChange={(e) => updateSettings('instagram', 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-pink-400" />
                  Business Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add specific information about your business that the AI should know
                </p>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={settingsData.instagram.knowledgeBase || ''}
                  onChange={(e) => updateSettings('instagram', 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-pink-400" />
                  Custom AI Instructions
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Tell the AI exactly how to behave and respond to customers
                </p>
                <textarea 
                  placeholder="Enter custom instructions for AI behavior..."
                  value={settingsData.instagram.customInstructions || ''}
                  onChange={(e) => updateSettings('instagram', 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-pink-400" />
                  Instagram AI Configuration
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Configure AI for Instagram DMs and post responses
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-respond to DMs</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.instagram.autoRespondDMs || false}
                        onChange={(e) => updateSettings('instagram', 'autoRespondDMs', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-respond to comments</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.instagram.autoRespondComments || false}
                        onChange={(e) => updateSettings('instagram', 'autoRespondComments', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSaveSettings('instagram')}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Instagram Settings'}
              </button>
              {saveMessage && activeAITab === 'instagram' && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}

          {activeAITab === 'text' && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData.text.businessName || ''}
                    onChange={(e) => updateSettings('text', 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData.text.industry || ''}
                    onChange={(e) => updateSettings('text', 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData.text.businessDescription || ''}
                    onChange={(e) => updateSettings('text', 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-green-400" />
                  Communication Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData.text.responseTone || 'Professional'}
                      onChange={(e) => updateSettings('text', 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData.text.responseLength || 'Short'}
                      onChange={(e) => updateSettings('text', 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Business Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add specific information about your business that the AI should know
                </p>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={settingsData.text.knowledgeBase || ''}
                  onChange={(e) => updateSettings('text', 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-green-400" />
                  Custom AI Instructions
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Tell the AI exactly how to behave and respond to customers
                </p>
                <textarea 
                  placeholder="Enter custom instructions for AI behavior..."
                  value={settingsData.text.customInstructions || ''}
                  onChange={(e) => updateSettings('text', 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-400" />
                  SMS/Text AI Configuration
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Configure AI for text message responses and lead qualification
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Enable auto-responses</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.text.enableAutoResponses || false}
                        onChange={(e) => updateSettings('text', 'enableAutoResponses', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Hot lead detection</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.text.hotLeadDetection || false}
                        onChange={(e) => updateSettings('text', 'hotLeadDetection', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  <input 
                    placeholder="Response delay (seconds)"
                    type="number"
                    value={settingsData.text.responseDelay || ''}
                    onChange={(e) => updateSettings('text', 'responseDelay', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                </div>
              </div>

              <button 
                onClick={() => handleSaveSettings('text')}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save SMS Settings'}
              </button>
              {saveMessage && activeAITab === 'text' && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}

          {activeAITab === 'chatbot' && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData.chatbot.businessName || ''}
                    onChange={(e) => updateSettings('chatbot', 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData.chatbot.industry || ''}
                    onChange={(e) => updateSettings('chatbot', 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData.chatbot.businessDescription || ''}
                    onChange={(e) => updateSettings('chatbot', 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  Communication Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData.chatbot.responseTone || 'Professional'}
                      onChange={(e) => updateSettings('chatbot', 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData.chatbot.responseLength || 'Short'}
                      onChange={(e) => updateSettings('chatbot', 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-[#0D1117] border border-gray-800 rounded-lg text-white text-sm [&>option]:bg-[#161B22] [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Business Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add specific information about your business that the AI should know
                </p>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={settingsData.chatbot.knowledgeBase || ''}
                  onChange={(e) => updateSettings('chatbot', 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-400" />
                  Custom AI Instructions
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Tell the AI exactly how to behave and respond to customers
                </p>
                <textarea 
                  placeholder="Enter custom instructions for AI behavior..."
                  value={settingsData.chatbot.customInstructions || ''}
                  onChange={(e) => updateSettings('chatbot', 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-gray-800 rounded-lg text-white placeholder:text-gray-600 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  Web Chatbot AI Configuration
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Configure AI for website chat widget responses
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Proactive engagement</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.chatbot.proactiveEngagement || false}
                        onChange={(e) => updateSettings('chatbot', 'proactiveEngagement', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Collect contact info</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsData.chatbot.collectContactInfo || false}
                        onChange={(e) => updateSettings('chatbot', 'collectContactInfo', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSaveSettings('chatbot')}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Chatbot Settings'}
              </button>
              {saveMessage && activeAITab === 'chatbot' && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isLoaded || initialLoad) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.firstName || 'User'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              dashboardData.webChat.aiStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-gray-400">
              AI {dashboardData.webChat.aiStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-gray-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Leads"
          value={dashboardData.analytics?.leadsCapture || dashboardData.combined.totalLeads}
          subtitle="All channels"
          trend={23}
          color="blue"
        />
        <StatCard
          icon={MessageCircle}
          title="Conversations"
          value={dashboardData.analytics?.totalInteractions || dashboardData.combined.totalConversations}
          subtitle="All channels"
          trend={15}
          color="green"
        />
        <StatCard
          icon={Activity}
          title="Total Messages"
          value={dashboardData.analytics?.totalInteractions || dashboardData.combined.totalMessages}
          subtitle="AI responses"
          color="purple"
        />
        <StatCard
          icon={Target}
          title="Hot Leads (24h)"
          value={dashboardData.analytics?.hotLeadsToday || dashboardData.combined.hotLeadsToday}
          subtitle="High intent"
          color="orange"
        />
      </div>

      {/* AI Performance + Lead Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI Performance */}
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Performance</h3>
              <p className="text-xs text-gray-500">Real AI behaviors across all channels</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {dashboardData.analytics?.phoneRequestsToday || 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Phone Requests Today</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">
                {dashboardData.analytics?.hotLeadsMonth || 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Hot Leads This Month</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">
                {dashboardData.analytics?.appointmentsScheduled || 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Appointments Scheduled</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-violet-400">
                {dashboardData.analytics?.aiEngagementRate?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-gray-500 mt-0.5">AI Engagement Rate</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/analytics')}
            className="w-full px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-violet-500/20"
          >
            View Full Analytics
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Management */}
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <UserCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Lead Management</h3>
              <p className="text-xs text-gray-500">Track and manage your pipeline</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {dashboardData.analytics?.leadsCapture || dashboardData.combined.totalLeads || 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Total Leads</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">
                {dashboardData.analytics?.hotLeadsMonth || dashboardData.combined.hotLeadsToday || 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Hot Leads</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">0</div>
              <div className="text-xs text-gray-500 mt-0.5">Warm Leads</div>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">0</div>
              <div className="text-xs text-gray-500 mt-0.5">Cold Leads</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/leads')}
              className="flex-1 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-cyan-500/20"
            >
              View All Leads
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/leads?filter=hot')}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
            >
              Hot Only
            </button>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <AISettingsSection />

    </div>
  );
}
