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
  Calendar
} from 'lucide-react';

export default function EmailDashboard() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [gmailEmails, setGmailEmails] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGmailEmail, setSelectedGmailEmail] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [gmailConnection, setGmailConnection] = useState(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeToday: 0,
    responseRate: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    loadEmailData();
    checkGmailConnection();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const response = await fetch('/api/gmail/status');
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setGmailConnection(data.connection);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const connectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  const checkGmailEmails = async () => {
    if (!gmailConnection) return;
    
    setGmailLoading(true);
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
        
        // Update stats with Gmail data
        setStats(prev => ({
          ...prev,
          totalConversations: (data.emails?.length || 0) + conversations.length,
          activeToday: data.emails?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error checking Gmail emails:', error);
    } finally {
      setGmailLoading(false);
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
          // Refresh Gmail emails after sending
          setTimeout(checkGmailEmails, 1000);
        }
        return data;
      }
    } catch (error) {
      console.error('Error sending AI response:', error);
    } finally {
      setResponding(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch('/api/customer/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
          recipientEmail: selectedConversation.customer_email
        })
      });

      if (response.ok) {
        setNewMessage('');
        loadEmailData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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
          <p className="text-gray-600">Manage AI-powered email conversations and responses</p>
        </div>
      </div>

      {/* Gmail Integration Status */}
      <Card className="mb-6">
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
                    onClick={checkGmailEmails}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/email/setup')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Email Setup</h3>
                <p className="text-sm text-gray-600">Configure email integration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/email/settings')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">AI Settings</h3>
                <p className="text-sm text-gray-600">Configure AI responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/email/manage-templates')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Email Templates</h3>
                <p className="text-sm text-gray-600">Manage email templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-sm text-gray-600">View email performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}m</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Conversations
              </CardTitle>
              <CardDescription>
                AI-managed email conversations
              </CardDescription>
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

              {/* Regular Conversations */}
              {conversations.length > 0 ? (
                <div className="space-y-0 max-h-48 overflow-y-auto">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setSelectedGmailEmail(null);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{conv.customer_name || 'Unknown'}</h4>
                        <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                          {conv.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{conv.customer_email}</p>
                      <p className="text-xs text-gray-500">
                        Last message: {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No email conversations yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {gmailConnection 
                      ? 'Send a test email or check for new messages'
                      : 'Set up your email integration to start receiving conversations'
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
          ) : selectedConversation ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversation with {selectedConversation.customer_name}
                </CardTitle>
                <CardDescription>
                  {selectedConversation.customer_email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-3">
                  <div className="text-center text-gray-500 text-sm">
                    Message history will appear here
                  </div>
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                  />
                  <Button onClick={sendMessage} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Email Features
              </CardTitle>
              <CardDescription>
                Powered by Bizzy Bot AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Auto-Response Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Gmail Integration</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">Smart Templates</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Lead Detection</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  Your AI assistant is monitoring email conversations and providing intelligent responses based on your configured templates and settings.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push('/email/settings')}>
                    Configure AI
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/email/manage-templates')}>
                    Manage Templates
                  </Button>
                  {gmailConnection && (
                    <Button size="sm" variant="outline" onClick={checkGmailEmails}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
