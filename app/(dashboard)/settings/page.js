'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  CreditCard,
  Shield,
  Bell,
  Mail,
  Key,
  Building,
  Globe,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Camera,
  Crown,
  Sparkles,
  ChevronRight,
  Settings,
  LogOut,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Zap,
  Star,
  Lock,
  Unlock,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  Info,
  Edit3,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Account Information State
  const [accountInfo, setAccountInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    avatarUrl: '',
    emailVerified: false,
    twoFactorEnabled: false,
    createdAt: '',
    lastSignIn: ''
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
    timezone: 'America/New_York',
    employeeCount: '',
    description: ''
  });
  
  // Subscription State
  const [subscription, setSubscription] = useState({
    plan: 'starter',
    status: 'active',
    currentPeriodEnd: '',
    seats: 1,
    usage: {
      conversations: 0,
      maxConversations: 1000,
      aiResponses: 0,
      maxAiResponses: 5000,
      emailsSent: 0,
      maxEmails: 1000
    },
    billing: {
      amount: 29,
      currency: 'USD',
      interval: 'month',
      nextBillingDate: ''
    }
  });
  
  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReport: true,
    leadAlerts: true,
    systemUpdates: false,
    marketingEmails: false
  });
  
  // Security Settings State
  const [security, setSecurity] = useState({
    changePassword: false,
    twoFactorAuth: false,
    sessionTimeout: 30,
    ipWhitelist: [],
    apiKeys: []
  });

  useEffect(() => {
    if (user) {
      loadUserData();
      loadBusinessProfile();
      loadSubscription();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load from Clerk user object
      setAccountInfo({
        email: user.emailAddresses?.[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        avatarUrl: user.imageUrl || '',
        emailVerified: user.emailAddresses?.[0]?.verification?.status === 'verified',
        twoFactorEnabled: user.twoFactorEnabled || false,
        createdAt: user.createdAt,
        lastSignIn: user.lastSignInAt
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadBusinessProfile = async () => {
    try {
      const response = await fetch('/api/customer/profile');
      const data = await response.json();
      
      if (data.success && data.customer) {
        setBusinessProfile(prev => ({
          ...prev,
          businessName: data.customer.business_name || '',
          ...data.customer.profile
        }));
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/customer/subscription');
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/customer/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountInfo)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Account information updated successfully!');
      } else {
        showMessage('error', data.error || 'Failed to update account');
      }
    } catch (error) {
      showMessage('error', 'Failed to save account information');
    }
    setSaving(false);
  };

  const handleSaveBusinessProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/customer/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessProfile)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Business profile updated successfully!');
      } else {
        showMessage('error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      showMessage('error', 'Failed to save business profile');
    }
    setSaving(false);
  };

  const handleUpgradePlan = (plan) => {
    router.push(`/upgrade?plan=${plan}`);
  };

  const handleCancelSubscription = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      try {
        const response = await fetch('/api/customer/cancel-subscription', {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('success', 'Subscription cancelled. You have access until the end of your billing period.');
          loadSubscription();
        } else {
          showMessage('error', data.error || 'Failed to cancel subscription');
        }
      } catch (error) {
        showMessage('error', 'Failed to cancel subscription');
      }
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUsagePercentage = (used, max) => {
    return Math.min((used / max) * 100, 100);
  };

  const getPlanColor = (plan) => {
    switch(plan) {
      case 'enterprise': return 'from-purple-600 to-pink-600';
      case 'professional': return 'from-blue-600 to-purple-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getPlanIcon = (plan) => {
    switch(plan) {
      case 'enterprise': return <Crown className="w-5 h-5" />;
      case 'professional': return <Zap className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
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
                <span>Back to Dashboard</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-gray-300" />
              <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-4">
                <nav className="space-y-1">
                  {[
                    { id: 'account', icon: User, label: 'Account' },
                    { id: 'business', icon: Building, label: 'Business Profile' },
                    { id: 'subscription', icon: CreditCard, label: 'Subscription' },
                    { id: 'notifications', icon: Bell, label: 'Notifications' },
                    { id: 'security', icon: Shield, label: 'Security' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === item.id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {activeTab === item.id && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="border-t border-white/10 p-4">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Message Alert */}
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl border ${
                message.type === 'success' 
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center space-x-2">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Account Information</h2>
                  <p className="text-gray-400">Manage your personal account details</p>
                </div>

                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 p-1">
                        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                          {accountInfo.avatarUrl ? (
                            <img 
                              src={accountInfo.avatarUrl} 
                              alt="Profile" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-12 h-12 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors">
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {accountInfo.firstName} {accountInfo.lastName}
                      </h3>
                      <p className="text-gray-400">@{accountInfo.username || 'username'}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        {accountInfo.emailVerified ? (
                          <span className="flex items-center space-x-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-yellow-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={accountInfo.firstName}
                        onChange={(e) => setAccountInfo({...accountInfo, firstName: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={accountInfo.lastName}
                        onChange={(e) => setAccountInfo({...accountInfo, lastName: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={accountInfo.email}
                        onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={accountInfo.username}
                        onChange={(e) => setAccountInfo({...accountInfo, username: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Account Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-sm text-gray-400">Member Since</p>
                      <p className="text-white font-medium">{formatDate(accountInfo.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Last Sign In</p>
                      <p className="text-white font-medium">{formatDate(accountInfo.lastSignIn)}</p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveAccount}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Business Profile Tab */}
            {activeTab === 'business' && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Business Profile</h2>
                  <p className="text-gray-400">Configure your business information</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={businessProfile.businessName}
                        onChange={(e) => setBusinessProfile({...businessProfile, businessName: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Acme Corporation"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Industry
                      </label>
                      <select
                        value={businessProfile.industry}
                        onChange={(e) => setBusinessProfile({...businessProfile, industry: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Industry</option>
                        <option value="technology">Technology</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="finance">Finance</option>
                        <option value="retail">Retail</option>
                        <option value="education">Education</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="services">Services</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={businessProfile.website}
                        onChange={(e) => setBusinessProfile({...businessProfile, website: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={businessProfile.phone}
                        onChange={(e) => setBusinessProfile({...businessProfile, phone: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={businessProfile.address}
                        onChange={(e) => setBusinessProfile({...businessProfile, address: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={businessProfile.city}
                        onChange={(e) => setBusinessProfile({...businessProfile, city: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="New York"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={businessProfile.state}
                        onChange={(e) => setBusinessProfile({...businessProfile, state: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="NY"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={businessProfile.zipCode}
                        onChange={(e) => setBusinessProfile({...businessProfile, zipCode: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Employee Count
                      </label>
                      <select
                        value={businessProfile.employeeCount}
                        onChange={(e) => setBusinessProfile({...businessProfile, employeeCount: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Size</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Description
                      </label>
                      <textarea
                        value={businessProfile.description}
                        onChange={(e) => setBusinessProfile({...businessProfile, description: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell us about your business..."
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveBusinessProfile}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Subscription & Billing</h2>
                    <p className="text-gray-400">Manage your subscription and usage</p>
                  </div>

                  {/* Current Plan Card */}
                  <div className={`p-6 rounded-xl bg-gradient-to-r ${getPlanColor(subscription.plan)} mb-6`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          {getPlanIcon(subscription.plan)}
                          <h3 className="text-2xl font-bold text-white capitalize">
                            {subscription.plan} Plan
                          </h3>
                        </div>
                        <p className="text-white/80 mb-4">
                          Your plan renews on {formatDate(subscription.billing.nextBillingDate)}
                        </p>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-bold text-white">
                            ${subscription.billing.amount}
                          </span>
                          <span className="text-white/80">
                            per {subscription.billing.interval}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-full">
                        {subscription.status === 'active' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-white" />
                            <span className="text-white font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-yellow-300" />
                            <span className="text-yellow-300 font-medium capitalize">{subscription.status}</span>
                          </>
                        )}
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
                          <span className="text-white">
                            {subscription.usage.conversations} / {subscription.usage.maxConversations}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${getUsagePercentage(subscription.usage.conversations, subscription.usage.maxConversations)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">AI Responses</span>
                          <span className="text-white">
                            {subscription.usage.aiResponses} / {subscription.usage.maxAiResponses}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                            style={{ width: `${getUsagePercentage(subscription.usage.aiResponses, subscription.usage.maxAiResponses)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">Emails Sent</span>
                          <span className="text-white">
                            {subscription.usage.emailsSent} / {subscription.usage.maxEmails}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                            style={{ width: `${getUsagePercentage(subscription.usage.emailsSent, subscription.usage.maxEmails)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    {subscription.plan !== 'enterprise' && (
                      <button
                        onClick={() => handleUpgradePlan('professional')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                      >
                        Upgrade Plan
                      </button>
                    )}
                    <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all">
                      Manage Billing
                    </button>
                    <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all">
                      Download Invoice
                    </button>
                    {subscription.status === 'active' && (
                      <button
                        onClick={handleCancelSubscription}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-all"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Plans */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Available Plans</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        name: 'Starter',
                        price: 29,
                        features: ['1,000 Conversations', '5,000 AI Responses', '1,000 Emails', 'Basic Analytics']
                      },
                      {
                        name: 'Professional',
                        price: 99,
                        features: ['10,000 Conversations', '50,000 AI Responses', '10,000 Emails', 'Advanced Analytics']
                      },
                      {
                        name: 'Enterprise',
                        price: 299,
                        features: ['Unlimited Conversations', 'Unlimited AI Responses', 'Unlimited Emails', 'Custom Features']
                      }
                    ].map((plan) => (
                      <div 
                        key={plan.name}
                        className={`p-4 rounded-xl border ${
                          subscription.plan === plan.name.toLowerCase()
                            ? 'bg-white/20 border-blue-500'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <h4 className="text-lg font-bold text-white mb-2">{plan.name}</h4>
                        <div className="text-2xl font-bold text-white mb-3">
                          ${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-300">
                              <Check className="w-4 h-4 mr-2 text-green-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {subscription.plan !== plan.name.toLowerCase() && (
                          <button
                            onClick={() => handleUpgradePlan(plan.name.toLowerCase())}
                            className="w-full py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
                          >
                            {subscription.plan === 'enterprise' || 
                             (subscription.plan === 'professional' && plan.name === 'Starter')
                              ? 'Downgrade' : 'Upgrade'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Notification Preferences</h2>
                  <p className="text-gray-400">Choose how you want to receive notifications</p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', icon: Mail },
                    { key: 'smsNotifications', label: 'SMS Notifications', icon: Phone },
                    { key: 'pushNotifications', label: 'Push Notifications', icon: Bell },
                    { key: 'weeklyReport', label: 'Weekly Reports', icon: BarChart3 },
                    { key: 'leadAlerts', label: 'Hot Lead Alerts', icon: Zap },
                    { key: 'systemUpdates', label: 'System Updates', icon: Info },
                    { key: 'marketingEmails', label: 'Marketing Emails', icon: Sparkles }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white font-medium">{item.label}</span>
                      </div>
                      <button
                        onClick={() => setNotifications({...notifications, [item.key]: !notifications[item.key]})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications[item.key] ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Security Settings</h2>
                  <p className="text-gray-400">Manage your account security and access</p>
                </div>

                <div className="space-y-6">
                  {/* Two-Factor Authentication */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <div>
                          <h3 className="text-white font-semibold">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <button className={`px-4 py-2 rounded-lg font-medium ${
                        security.twoFactorAuth 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}>
                        {security.twoFactorAuth ? 'Enabled' : 'Enable 2FA'}
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Key className="w-5 h-5 text-purple-400" />
                        <div>
                          <h3 className="text-white font-semibold">Password</h3>
                          <p className="text-sm text-gray-400">Last changed 30 days ago</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20">
                        Change Password
                      </button>
                    </div>
                  </div>

                  {/* API Keys */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Lock className="w-5 h-5 text-yellow-400" />
                        <div>
                          <h3 className="text-white font-semibold">API Keys</h3>
                          <p className="text-sm text-gray-400">Manage your API access tokens</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20">
                        Generate New Key
                      </button>
                    </div>
                    {security.apiKeys.length === 0 && (
                      <p className="text-gray-400 text-sm">No API keys generated yet</p>
                    )}
                  </div>

                  {/* Session Timeout */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-green-400" />
                        <div>
                          <h3 className="text-white font-semibold">Session Timeout</h3>
                          <p className="text-sm text-gray-400">Automatically sign out after inactivity</p>
                        </div>
                      </div>
                      <select
                        value={security.sessionTimeout}
                        onChange={(e) => setSecurity({...security, sessionTimeout: parseInt(e.target.value)})}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-red-400 font-semibold">Delete Account</h4>
                          <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
                        </div>
                        <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
