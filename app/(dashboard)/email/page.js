'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  Settings, 
  Send, 
  Users, 
  TrendingUp, 
  Clock, 
  ArrowLeft,
  MessageSquare,
  Bot,
  FileText,
  Sparkles,
  Zap,
  Target,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  Link as LinkIcon,
  Globe,
  BarChart3,
  Wrench,
  Volume2,
  VolumeX,
  Filter,
  Inbox
} from 'lucide-react';

export default function StableEmailDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Existing functionality states
  const [conversations, setConversations] = useState([]);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGmailEmail, setSelectedGmailEmail] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [gmailConnection, setGmailConnection] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeToday: 0,
    responseRate: 0,
    avgResponseTime: 0
  });

  // AI Settings states
  const [aiSettings, setAiSettings] = useState({
    tone: 'professional',
    expertise: '',
    specialties: '',
    response_style: '',
    hot_lead_keywords: ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
    auto_response_enabled: false,
    alert_hot_leads: true,
    include_availability: true,
    ask_qualifying_questions: true,
    require_approval: false
  });

  // Settings states
  const [dashboardSettings, setDashboardSettings] = useState({
    autoRefresh: false,
    soundNotifications: false,
    refreshInterval: 30
  });

  // Tab configuration
  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3,
      description: 'Real-time Gmail conversations and AI responses'
    },
    { 
      id: 'ai-settings', 
      label: 'AI Settings', 
      icon: Bot,
      description: 'Configure AI personality and response behavior'
    },
    { 
      id: 'automation', 
      label: 'Automation', 
      icon: Wrench,
      description: 'Email filtering and automation rules'
    }
  ];

  // Load data only once on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEmailData(),
        checkGmailConnection(),
        loadAISettings()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmailData = async () => {
    try {
      const convResponse = await fetch('/api/customer/email-conversations');
      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData.conversations || []);
      }

      const statsResponse = await fetch('/api/customer/email-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }
    } catch (error) {
      console.error('Error loading email data:', error);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const response = await fetch('/api/gmail/status');
      if (response.ok) {
        const data = await response.json();
        
        if (data.connected && data.connection) {
          setGmailConnection(data.connection);
          setStats(prev => ({ ...prev, responseRate: 95 }));
        } else {
          setGmailConnection(null);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setGmailConnection(null);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await fetch('/api/customer/ai-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setAiSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      // AI settings might not exist yet, use defaults
      console.log('AI settings not found, using defaults');
    }
  };

  const saveAISettings = async () => {
    try {
      const response = await fetch('/api/customer/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings)
      });

      if (response.ok) {
        console.log('✅ AI settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving AI settings:', error);
    }
  };

  const connectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  const checkGmailEmails = async (silent = false) => {
    if (!gmailConnection) return;
    
    if (!silent) setGmailLoading(true);
    try {
      const response = await fetch('/api/gmail/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          emailAddress: gmailConnection.email
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGmailEmails(data.emails || []);
        setStats(prev => ({
          ...prev,
          totalConversations: (data.emails?.length || 0) + conversations.length,
          activeToday: data.emails?.length || 0
        }));
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error checking Gmail emails:', error);
    } finally {
      if (!silent) setGmailLoading(false);
    }
  };

  const sendAIResponse = async (emailId, preview = false) => {
    if (!gmailConnection) return;
    
    setResponding(true);
    try {
      const response = await fetch('/api/gmail/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          emailAddress: gmailConnection.email,
          emailId: emailId,
          actualSend: !preview
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!preview) {
          setTimeout(() => checkGmailEmails(false), 1000);
        }
        return data;
      }
    } catch (error) {
      console.error('Error sending AI response:', error);
    } finally {
      setResponding(false);
    }
  };

  // Dashboard Tab Component
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Gmail Integration Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${gmailConnection ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {gmailConnection ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">
                  {gmailConnection ? 'Gmail AI Connected' : 'Gmail AI Setup'}
                </h3>
                <p className="text-sm text-gray-600">
                  {gmailConnection 
                    ? `Connected to ${gmailConnection.email}` 
                    : 'Connect Gmail for AI-powered email automation'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {gmailConnection ? (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => checkGmailEmails(false)}
                    disabled={gmailLoading}
                    className="flex items-center gap-2"
                  >
                    {gmailLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Check Emails
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open('/email/test', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Advanced Testing
                  </Button>
                </>
              ) : (
                <Button onClick={connectGmail} className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Connect Gmail
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold">{stats.totalConversations}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold">{stats.activeToday}</p>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Response Rate</p>
                <p className="text-2xl font-bold">{stats.responseRate}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Refreshed</p>
                <p className="text-sm font-bold">{lastRefresh.toLocaleTimeString()}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations and Response Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Email Conversations ({gmailEmails.length + conversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Gmail Conversations */}
              {gmailEmails.length > 0 && (
                <div className="border-b">
                  <div className="px-4 py-2 bg-blue-50 border-b">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Gmail AI ({gmailEmails.length})</span>
                    </div>
                  </div>
                  <div className="space-y-0 max-h-48 overflow-y-auto">
                    {gmailEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedGmailEmail?.id === email.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => {
                          setSelectedGmailEmail(email);
                          setSelectedConversation(null);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{email.fromName || email.fromEmail}</h4>
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Gmail
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{email.subject}</p>
                        <p className="text-xs text-gray-500">
                          Received: {email.receivedTime}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conversations.length === 0 && gmailEmails.length === 0 && (
                <div className="p-8 text-center">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No email conversations yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {gmailConnection 
                      ? 'Click "Check Emails" to look for new messages'
                      : 'Connect Gmail to start receiving conversations'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Gmail Email Details */}
          {selectedGmailEmail ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Gmail Email from {selectedGmailEmail.fromName || selectedGmailEmail.fromEmail}
                </CardTitle>
                <CardDescription>
                  Subject: {selectedGmailEmail.subject}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Email Content:</p>
                  <div className="max-h-32 overflow-y-auto text-sm">
                    {selectedGmailEmail.fullBody || selectedGmailEmail.body}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => sendAIResponse(selectedGmailEmail.id, true)}
                    disabled={responding}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview AI Response
                  </Button>
                  <Button 
                    onClick={() => sendAIResponse(selectedGmailEmail.id, false)}
                    disabled={responding}
                    className="flex items-center gap-2"
                  >
                    {responding ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send AI Response
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Select a conversation to view details</p>
                {gmailConnection && (
                  <p className="text-sm text-gray-500 mt-2">
                    Gmail conversations will show real-time AI responses
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Features Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Email Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Auto-Response: {aiSettings.auto_response_enabled ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Gmail: {gmailConnection ? 'Connected' : 'Not Connected'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">AI Tone: {aiSettings.tone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Hot Lead Alerts: {aiSettings.alert_hot_leads ? 'On' : 'Off'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // AI Settings Tab Component  
  const AISettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Personality & Expertise</CardTitle>
          <CardDescription>Configure how the AI represents your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Communication Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {['professional', 'casual', 'formal'].map(tone => (
                  <Button
                    key={tone}
                    variant={aiSettings.tone === tone ? "default" : "outline"}
                    onClick={() => setAiSettings(prev => ({ ...prev, tone }))}
                    className="capitalize text-sm"
                    size="sm"
                  >
                    {tone}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Primary Expertise</label>
              <Input
                value={aiSettings.expertise}
                onChange={(e) => setAiSettings(prev => ({ ...prev, expertise: e.target.value }))}
                placeholder="e.g., Real Estate, Consulting, Marketing"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Specialties</label>
            <Input
              value={aiSettings.specialties}
              onChange={(e) => setAiSettings(prev => ({ ...prev, specialties: e.target.value }))}
              placeholder="e.g., Residential homes, Commercial properties"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Response Style</label>
            <Textarea
              value={aiSettings.response_style}
              onChange={(e) => setAiSettings(prev => ({ ...prev, response_style: e.target.value }))}
              placeholder="Describe how you want the AI to respond"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Settings</CardTitle>
          <CardDescription>Control how the AI interacts with customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'auto_response_enabled', label: 'Auto-Response Enabled', desc: 'AI automatically responds to emails' },
              { key: 'alert_hot_leads', label: 'Hot Lead Alerts', desc: 'Get notified about high-priority inquiries' },
              { key: 'include_availability', label: 'Include Availability', desc: 'Mention scheduling availability in responses' },
              { key: 'ask_qualifying_questions', label: 'Ask Qualifying Questions', desc: 'AI asks questions to understand customer needs' },
              { key: 'require_approval', label: 'Require Approval', desc: 'Review AI responses before sending' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={aiSettings[key]}
                  onChange={(e) => setAiSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-1 rounded border-gray-300"
                />
                <div>
                  <label className="text-sm font-medium">{label}</label>
                  <p className="text-xs text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveAISettings} className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Save AI Settings
        </Button>
      </div>
    </div>
  );

  // Automation Tab Component
  const AutomationTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Connection & Monitoring
          </CardTitle>
          <CardDescription>Your Gmail integration status and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${gmailConnection ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <span className="font-medium">
                  {gmailConnection ? `Connected to ${gmailConnection.email}` : 'Not Connected'}
                </span>
                <p className="text-sm text-gray-600">
                  {gmailConnection 
                    ? 'Gmail monitoring is active with AI responses' 
                    : 'Connect Gmail to enable email automation'
                  }
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={gmailConnection ? checkGmailConnection : connectGmail}>
              {gmailConnection ? 'Refresh' : 'Connect Gmail'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
          <CardDescription>Manual email checking and refresh controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={() => checkGmailEmails(false)}
              disabled={gmailLoading || !gmailConnection}
              className="flex items-center gap-2"
            >
              {gmailLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Check Emails Now
            </Button>
            
            <Button 
              onClick={checkGmailConnection}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Connection
            </Button>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">System Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Gmail Connected:</span>
                <span className="ml-2 font-medium">{gmailConnection ? '✅ Yes' : '❌ No'}</span>
              </div>
              <div>
                <span className="text-blue-700">AI Responses:</span>
                <span className="ml-2 font-medium">{aiSettings.auto_response_enabled ? '✅ Enabled' : '❌ Disabled'}</span>
              </div>
              <div>
                <span className="text-blue-700">Last Check:</span>
                <span className="ml-2 font-medium">{lastRefresh.toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="text-blue-700">Hot Lead Alerts:</span>
                <span className="ml-2 font-medium">{aiSettings.alert_hot_leads ? '✅ On' : '❌ Off'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email AI Manager
          </h1>
          <p className="text-gray-600">Enhanced Gmail automation with smart AI responses</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'ai-settings' && <AISettingsTab />}
        {activeTab === 'automation' && <AutomationTab />}
      </div>
    </div>
  );
}
