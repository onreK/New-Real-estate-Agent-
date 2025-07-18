// ConnectionsTab.js - Component for the Connections tab
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Zap,
  ExternalLink,
  Activity,
  Link as LinkIcon
} from 'lucide-react';

export default function ConnectionsTab() {
  // Connection states
  const [gmailConnection, setGmailConnection] = useState({ connected: false, email: '' });
  const [domainConnection, setDomainConnection] = useState({ configured: false });
  const [activeConnection, setActiveConnection] = useState('none'); // 'gmail', 'domain', or 'none'
  
  // Loading states
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  
  // Domain settings
  const [domainSettings, setDomainSettings] = useState({
    businessName: '',
    customDomain: '',
    emailAddress: ''
  });

  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      // Check Gmail connection
      const gmailResponse = await fetch('/api/auth/google', { method: 'POST' });
      const gmailData = await gmailResponse.json();
      
      if (gmailData.success && gmailData.connected) {
        setGmailConnection({ connected: true, email: gmailData.email });
        setActiveConnection('gmail');
      }

      // Load domain settings (you'd implement this API)
      // const domainResponse = await fetch('/api/customer/email-settings');
      // const domainData = await domainResponse.json();
      // if (domainData.success && domainData.settings) {
      //   setDomainSettings(domainData.settings);
      //   setDomainConnection({ configured: true });
      //   if (!gmailData.connected) setActiveConnection('domain');
      // }

    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const connectGmail = async () => {
    setLoadingGmail(true);
    try {
      // Redirect to Gmail OAuth
      window.location.href = '/api/auth/google';
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setMessage({ type: 'error', text: 'Error connecting to Gmail. Please try again.' });
      setLoadingGmail(false);
    }
  };

  const disconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account?')) return;
    
    try {
      // You'd implement this disconnect API
      // await fetch('/api/auth/google/disconnect', { method: 'POST' });
      setGmailConnection({ connected: false, email: '' });
      if (activeConnection === 'gmail') setActiveConnection('none');
      setMessage({ type: 'success', text: 'Gmail disconnected successfully.' });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setMessage({ type: 'error', text: 'Error disconnecting Gmail.' });
    }
  };

  const testGmailConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch('/api/gmail/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          emailAddress: gmailConnection.email,
          customMessage: 'Test connection message',
          actualSend: false
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Gmail connection test successful!' });
      } else {
        setMessage({ type: 'error', text: 'Gmail connection test failed.' });
      }
    } catch (error) {
      console.error('Error testing Gmail connection:', error);
      setMessage({ type: 'error', text: 'Error testing Gmail connection.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const saveDomainSettings = async () => {
    setSavingDomain(true);
    try {
      // You'd implement this API to save domain settings
      // const response = await fetch('/api/customer/email-settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(domainSettings)
      // });
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDomainConnection({ configured: true });
      if (activeConnection === 'none') setActiveConnection('domain');
      setMessage({ type: 'success', text: 'Domain email settings saved successfully!' });
    } catch (error) {
      console.error('Error saving domain settings:', error);
      setMessage({ type: 'error', text: 'Error saving domain settings.' });
    } finally {
      setSavingDomain(false);
    }
  };

  const switchToGmail = () => {
    if (gmailConnection.connected) {
      setActiveConnection('gmail');
      setMessage({ type: 'success', text: 'Switched to Gmail connection.' });
    }
  };

  const switchToDomain = () => {
    if (domainConnection.configured) {
      setActiveConnection('domain');
      setMessage({ type: 'success', text: 'Switched to domain email connection.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Connection Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${
                activeConnection === 'gmail' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Mail className={`w-6 h-6 ${
                  activeConnection === 'gmail' ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="font-medium text-gray-900">Gmail</p>
              <p className={`text-sm ${
                activeConnection === 'gmail' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {activeConnection === 'gmail' ? 'Active' : gmailConnection.connected ? 'Available' : 'Not Connected'}
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${
                activeConnection === 'domain' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Globe className={`w-6 h-6 ${
                  activeConnection === 'domain' ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="font-medium text-gray-900">Domain Email</p>
              <p className={`text-sm ${
                activeConnection === 'domain' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {activeConnection === 'domain' ? 'Active' : domainConnection.configured ? 'Available' : 'Not Configured'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-medium text-gray-900">AI Status</p>
              <p className={`text-sm ${
                activeConnection !== 'none' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {activeConnection !== 'none' ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Gmail Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gmailConnection.connected ? (
            <div>
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Connected to Gmail</p>
                    <p className="text-sm text-green-600">{gmailConnection.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {activeConnection !== 'gmail' && (
                    <Button
                      onClick={switchToGmail}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Make Active
                    </Button>
                  )}
                  {activeConnection === 'gmail' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={testGmailConnection}
                  disabled={testingConnection}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {testingConnection ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                  Test Connection
                </Button>
                
                <Button
                  onClick={connectGmail}
                  disabled={loadingGmail}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </Button>

                <Button
                  onClick={disconnectGmail}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Gmail Account</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Gmail account to enable AI-powered email responses. 
                Your emails will be monitored and responded to automatically.
              </p>
              
              <Button
                onClick={connectGmail}
                disabled={loadingGmail}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                {loadingGmail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Connect Gmail Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Email Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            Domain Email Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {domainConnection.configured ? (
            <div>
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Domain Email Configured</p>
                    <p className="text-sm text-green-600">
                      {domainSettings.emailAddress || `agent@${domainSettings.customDomain}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {activeConnection !== 'domain' && (
                    <Button
                      onClick={switchToDomain}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Make Active
                    </Button>
                  )}
                  {activeConnection === 'domain' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Set Up Domain Email</h3>
              <p className="text-gray-600 mb-4">
                Use your existing business domain for professional email automation.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={domainSettings.businessName}
                onChange={(e) => setDomainSettings({...domainSettings, businessName: e.target.value})}
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <Label htmlFor="customDomain">Your Domain</Label>
              <Input
                id="customDomain"
                value={domainSettings.customDomain}
                onChange={(e) => setDomainSettings({...domainSettings, customDomain: e.target.value})}
                placeholder="yourbusiness.com"
              />
              {domainSettings.customDomain && (
                <p className="text-sm text-gray-500 mt-1">
                  Email will be: agent@{domainSettings.customDomain}
                </p>
              )}
            </div>

            {domainSettings.customDomain && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  DNS Setup Required
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Add these DNS records to your domain to enable email processing:
                </p>
                <div className="bg-white rounded border p-3 font-mono text-xs">
                  <div className="grid grid-cols-4 gap-2 text-gray-500 mb-2">
                    <span>Type</span>
                    <span>Name</span>
                    <span>Value</span>
                    <span>Priority</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span>MX</span>
                    <span>@</span>
                    <span>mail.bizzybotai.com</span>
                    <span>10</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 flex items-center gap-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Full Instructions
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={saveDomainSettings}
                disabled={savingDomain || !domainSettings.businessName || !domainSettings.customDomain}
                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
              >
                {savingDomain ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                Save Domain Settings
              </Button>
              
              {domainConnection.configured && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove Configuration
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Gmail Connection</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Quick setup with OAuth</li>
                <li>• Uses your existing Gmail account</li>
                <li>• Secure and encrypted connection</li>
                <li>• Instant AI email responses</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Domain Email</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Professional branded emails</li>
                <li>• Requires DNS configuration</li>
                <li>• Uses your business domain</li>
                <li>• Maximum professionalism</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
