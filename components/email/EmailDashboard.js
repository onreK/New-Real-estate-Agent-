// components/email/EmailDashboard.jsx
// Email automation dashboard that integrates with your existing chatbot

import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Calendar, Activity, Users, Zap, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const EmailDashboard = () => {
  const [emailStats, setEmailStats] = useState({
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    responseRate: 0
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'hot_lead_email',
      email: 'john.doe@example.com',
      name: 'John D.',
      subject: 'Quick follow-up about your property inquiry',
      status: 'sent',
      timestamp: '2 min ago',
      leadScore: 85,
      action: 'Email sent automatically'
    },
    {
      id: 2,
      type: 'welcome_email',
      email: 'sarah.m@example.com',
      name: 'Sarah M.',
      subject: 'Welcome! Let\'s find your dream home',
      status: 'opened',
      timestamp: '15 min ago',
      leadScore: 45,
      action: 'Welcome sequence started'
    },
    {
      id: 3,
      type: 'lead_logged',
      email: 'mike.r@example.com',
      name: 'Mike R.',
      subject: 'Contact logged for future campaigns',
      status: 'logged',
      timestamp: '1 hour ago',
      leadScore: 25,
      action: 'Contact added to database'
    }
  ]);

  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [generatedEmail, setGeneratedEmail] = useState(null);

  // Load email stats on component mount
  useEffect(() => {
    loadEmailStats();
  }, []);

  const loadEmailStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      if (response.ok) {
        const stats = await response.json();
        setEmailStats(stats);
      }
    } catch (error) {
      console.error('Error loading email stats:', error);
    }
  };

  // Test email generation
  const generateTestEmail = async () => {
    setIsGeneratingEmail(true);
    
    try {
      const testLeadData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        businessType: 'real estate',
        message: 'Looking to buy a house in the downtown area',
        score: 75
      };

      const response = await fetch('/api/email/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadData: testLeadData,
          emailType: 'follow_up'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedEmail(result.emailContent);
        setSelectedLead(testLeadData);
      } else {
        console.error('Failed to generate email');
      }
    } catch (error) {
      console.error('Error generating email:', error);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const testEmailIntegration = async () => {
    try {
      const response = await fetch('/api/email/chatbot-integration', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Email integration test: ${result.status}`);
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      alert('Integration test failed');
    }
  };

  const getStatusBadge = (type, status) => {
    const statusConfigs = {
      hot_lead_email: { 
        bg: 'bg-red-100 text-red-800', 
        icon: '🔥', 
        text: 'HOT LEAD EMAIL' 
      },
      welcome_email: { 
        bg: 'bg-blue-100 text-blue-800', 
        icon: '👋', 
        text: 'WELCOME EMAIL' 
      },
      lead_logged: { 
        bg: 'bg-gray-100 text-gray-800', 
        icon: '📝', 
        text: 'LOGGED' 
      }
    };

    const statusIcons = {
      sent: <CheckCircle size={12} className="text-green-600" />,
      opened: <Mail size={12} className="text-blue-600" />,
      logged: <Users size={12} className="text-gray-600" />
    };

    return {
      type: statusConfigs[type] || statusConfigs.lead_logged,
      status: statusIcons[status] || statusIcons.logged
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Email Automation Dashboard</h1>
        <p className="text-gray-600">AI-powered email responses integrated with your chatbot</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold text-gray-900">{emailStats.totalSent}</p>
            </div>
            <Mail className="text-blue-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Rate</p>
              <p className="text-2xl font-bold text-gray-900">{emailStats.openRate}%</p>
            </div>
            <Activity className="text-green-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Click Rate</p>
              <p className="text-2xl font-bold text-gray-900">{emailStats.clickRate}%</p>
            </div>
            <Zap className="text-purple-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{emailStats.responseRate}%</p>
            </div>
            <MessageCircle className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Integration Flow */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Automated Lead Flow</h2>
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="text-center">
            <MessageCircle className="mx-auto text-blue-600 mb-2" size={24} />
            <div className="text-sm font-medium">Chatbot Lead</div>
            <div className="text-xs text-gray-600">Visitor chats</div>
          </div>
          <div className="text-2xl text-gray-400">→</div>
          <div className="text-center">
            <Activity className="mx-auto text-purple-600 mb-2" size={24} />
            <div className="text-sm font-medium">AI Scoring</div>
            <div className="text-xs text-gray-600">Hot/Warm/Cold</div>
          </div>
          <div className="text-2xl text-gray-400">→</div>
          <div className="text-center">
            <Mail className="mx-auto text-green-600 mb-2" size={24} />
            <div className="text-sm font-medium">Auto Email</div>
            <div className="text-xs text-gray-600">AI generated</div>
          </div>
          <div className="text-2xl text-gray-400">→</div>
          <div className="text-center">
            <Calendar className="mx-auto text-orange-600 mb-2" size={24} />
            <div className="text-sm font-medium">Follow-ups</div>
            <div className="text-xs text-gray-600">Scheduled</div>
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🧪 Test Email Automation</h2>
        <div className="flex gap-4">
          <button
            onClick={generateTestEmail}
            disabled={isGeneratingEmail}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGeneratingEmail ? 'Generating...' : 'Generate Test Email'}
          </button>
          <button
            onClick={testEmailIntegration}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Integration
          </button>
        </div>
      </div>

      {/* Recent Email Activity */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">🚀 Recent Email Automation Activity</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const badges = getStatusBadge(activity.type, activity.status);
              
              return (
                <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{activity.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges.type.bg}`}>
                          {badges.type.icon} {badges.type.text}
                        </span>
                        <span className="flex items-center gap-1">
                          {badges.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Email:</span> {activity.email}
                        </div>
                        <div>
                          <span className="font-medium">Subject:</span> {activity.subject}
                        </div>
                        <div>
                          <span className="font-medium">Score:</span> {activity.leadScore}/100
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span className="font-medium text-sm text-gray-700">Action:</span>
                        <span className="text-sm text-gray-600 ml-1">{activity.action}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {activity.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generated Email Preview Modal */}
      {generatedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">AI Generated Email Preview</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line:</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    {generatedEmail.subject}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Content:</label>
                  <div 
                    className="p-4 bg-gray-50 rounded-lg border max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: generatedEmail.htmlContent }}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setGeneratedEmail(null);
                      setSelectedLead(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDashboard;
