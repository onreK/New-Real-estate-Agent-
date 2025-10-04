'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  Building,
  Bell,
  Shield,
  DollarSign,
  Cpu,
  Settings,
  Camera,
  Crown,
  Key,
  Lock,
  Mail,
  Phone,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sliders,
  Bot,
  MessageCircle,
  Users,
  Star
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [settingsCategory, setSettingsCategory] = useState('ai');
  const [activeAITab, setActiveAITab] = useState('email');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Account Settings State
  const [accountInfo, setAccountInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    imageUrl: ''
  });

  // Business Profile State  
  const [businessProfile, setBusinessProfile] = useState({
    businessName: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    employeeCount: '',
    description: ''
  });

  // Subscription State
  const [subscription, setSubscription] = useState({
    plan: 'starter',
    status: 'active',
    usage: {
      conversations: 42,
      maxConversations: 1000,
      aiResponses: 168,
      maxAiResponses: 5000,
      emailsSent: 35,
      maxEmails: 1000
    },
    billing: {
      amount: 29,
      currency: 'USD',
      interval: 'month',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  });

  // AI Settings State
  const [aiSettings, setAiSettings] = useState({
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

  useEffect(() => {
    if (user) {
      setAccountInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        username: user.username || '',
        imageUrl: user.imageUrl || ''
      });
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load AI settings
      const aiResponse = await fetch('/api/ai-settings');
      if (aiResponse.ok) {
        const data = await aiResponse.json();
        if (data.settings) {
          setAiSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
      
      // Load business profile
      const profileResponse = await fetch('/api/customer/profile');
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        if (data.customer) {
          setBusinessProfile(prev => ({
            ...prev,
            businessName: data.customer.business_name || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAISettings = async (channel) => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channel,
          settings: aiSettings[channel]
        })
      });

      if (response.ok) {
        setSaveMessage(`${channel.charAt(0).toUpperCase() + channel.slice(1)} settings saved successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings. Please try again.');
      }
    } catch (error) {
      setSaveMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateAISettings = (channel, field, value) => {
    setAiSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }));
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Settings...</p>
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
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Category Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setSettingsCategory('ai')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              settingsCategory === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span>AI Configuration</span>
          </button>
          
          <button
            onClick={() => setSettingsCategory('account')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              settingsCategory === 'account'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Account</span>
          </button>
          
          <button
            onClick={() => setSettingsCategory('business')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              settingsCategory === 'business'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            <Building className="w-5 h-5" />
            <span>Business Profile</span>
          </button>
          
          <button
            onClick={() => setSettingsCategory('billing')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
              settingsCategory === 'billing'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Billing</span>
          </button>
        </div>

        {/* AI Configuration Content */}
        {settingsCategory === 'ai' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">AI Configuration</h2>
              <p className="text-gray-400">Configure AI behavior across all channels</p>
            </div>

            {/* AI Channel Tabs */}
            <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2">
              {[
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'facebook', label: 'Facebook', icon: Users },
                { id: 'instagram', label: 'Instagram', icon: Star },
                { id: 'text', label: 'Text/SMS', icon: Phone },
                { id: 'chatbot', label: 'Chatbot', icon: MessageCircle }
              ].map((tab) => (
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

            {/* AI Settings Content for Each Channel */}
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">Business Profile</h4>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={aiSettings[activeAITab].businessName || ''}
                    onChange={(e) => updateAISettings(activeAITab, 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  />
                  <input 
                    placeholder="Industry"
                    value={aiSettings[activeAITab].industry || ''}
                    onChange={(e) => updateAISettings(activeAITab, 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={aiSettings[activeAITab].businessDescription || ''}
                    onChange={(e) => updateAISettings(activeAITab, 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">Communication Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={aiSettings[activeAITab].responseTone || 'Professional'}
                      onChange={(e) => updateAISettings(activeAITab, 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm [&>option]:bg-gray-800"
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
                      value={aiSettings[activeAITab].responseLength || 'Short'}
                      onChange={(e) => updateAISettings(activeAITab, 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm [&>option]:bg-gray-800"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">Knowledge Base</h4>
                <textarea 
                  placeholder="Enter business-specific information, FAQs, policies, etc..."
                  value={aiSettings[activeAITab].knowledgeBase || ''}
                  onChange={(e) => updateAISettings(activeAITab, 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-32 resize-none"
                />
              </div>

              <button 
                onClick={() => handleSaveAISettings(activeAITab)}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : `Save ${activeAITab.charAt(0).toUpperCase() + activeAITab.slice(1)} Settings`}
              </button>
              
              {saveMessage && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Settings Content */}
        {settingsCategory === 'account' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Account Settings</h2>
              <p className="text-gray-400">Manage your personal account information</p>
            </div>

            {/* Profile Picture */}
            <div className="flex items-center space-x-6 mb-8 p-4 bg-white/5 rounded-xl">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 p-1">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                    {accountInfo.imageUrl ? (
                      <img src={accountInfo.imageUrl} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full hover:bg-blue-700">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {accountInfo.firstName} {accountInfo.lastName}
                </h3>
                <p className="text-gray-400">@{accountInfo.username || 'username'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={accountInfo.firstName}
                  onChange={(e) => setAccountInfo({...accountInfo, firstName: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={accountInfo.lastName}
                  onChange={(e) => setAccountInfo({...accountInfo, lastName: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={accountInfo.email}
                  onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={accountInfo.username}
                  onChange={(e) => setAccountInfo({...accountInfo, username: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
              Save Account Settings
            </button>
          </div>
        )}

        {/* Business Profile Content */}
        {settingsCategory === 'business' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Business Profile</h2>
              <p className="text-gray-400">Configure your business information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
                <input
                  type="text"
                  value={businessProfile.businessName}
                  onChange={(e) => setBusinessProfile({...businessProfile, businessName: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                <select
                  value={businessProfile.industry}
                  onChange={(e) => setBusinessProfile({...businessProfile, industry: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white [&>option]:bg-gray-800"
                >
                  <option value="">Select Industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                <input
                  type="url"
                  value={businessProfile.website}
                  onChange={(e) => setBusinessProfile({...businessProfile, website: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={businessProfile.phone}
                  onChange={(e) => setBusinessProfile({...businessProfile, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={businessProfile.description}
                  onChange={(e) => setBusinessProfile({...businessProfile, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Tell us about your business..."
                />
              </div>
            </div>

            <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition-all">
              Save Business Profile
            </button>
          </div>
        )}

        {/* Billing Content */}
        {settingsCategory === 'billing' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Billing & Subscription</h2>
              <p className="text-gray-400">Manage your plan and usage</p>
            </div>

            {/* Current Plan */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-6 h-6 text-white" />
                    <h3 className="text-2xl font-bold text-white capitalize">{subscription.plan} Plan</h3>
                  </div>
                  <p className="text-white/80 mb-4">Your plan renews {subscription.billing.interval}ly</p>
                  <div className="text-3xl font-bold text-white">
                    ${subscription.billing.amount}<span className="text-lg font-normal text-white/80">/{subscription.billing.interval}</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white/20 rounded-full">
                  <span className="text-white font-medium capitalize">{subscription.status}</span>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-semibold text-white">Usage This Month</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Conversations</span>
                    <span className="text-white">{subscription.usage.conversations} / {subscription.usage.maxConversations}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${(subscription.usage.conversations / subscription.usage.maxConversations) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">AI Responses</span>
                    <span className="text-white">{subscription.usage.aiResponses} / {subscription.usage.maxAiResponses}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(subscription.usage.aiResponses / subscription.usage.maxAiResponses) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Emails Sent</span>
                    <span className="text-white">{subscription.usage.emailsSent} / {subscription.usage.maxEmails}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${(subscription.usage.emailsSent / subscription.usage.maxEmails) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-teal-700">
                Upgrade Plan
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20">
                Manage Billing
              </button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20">
                Download Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
