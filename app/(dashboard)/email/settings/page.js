'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function EmailAISettings() {
  const { user } = useUser();
  const [settings, setSettings] = useState({
    ai_personality: '',
    tone: 'professional',
    expertise: '',
    specialties: '',
    response_style: '',
    hot_lead_keywords: ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'],
    auto_response_enabled: true,
    alert_hot_leads: true,
    include_availability: true,
    ask_qualifying_questions: true,
    require_approval: false
  });
  const [customKeyword, setCustomKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (user) {
      loadCustomerData();
      loadAISettings();
    }
  }, [user]);

  const loadCustomerData = async () => {
    try {
      const response = await fetch('/api/customer/profile');
      const data = await response.json();
      if (data.success) {
        setCustomer(data.customer);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await fetch('/api/customer/ai-settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings({
          ...settings,
          ...data.settings,
          hot_lead_keywords: data.settings.hot_lead_keywords || settings.hot_lead_keywords
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const saveAISettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/customer/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        alert('AI settings saved successfully!');
      } else {
        alert('Error saving settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !settings.hot_lead_keywords.includes(customKeyword.trim().toLowerCase())) {
      setSettings({
        ...settings,
        hot_lead_keywords: [...settings.hot_lead_keywords, customKeyword.trim().toLowerCase()]
      });
      setCustomKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setSettings({
      ...settings,
      hot_lead_keywords: settings.hot_lead_keywords.filter(k => k !== keyword)
    });
  };

  const testAIResponse = async () => {
    try {
      const response = await fetch('/api/customer/test-ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Hi, I'm urgently looking for a 3-bedroom house under $500K. Can you help me find something ASAP?",
          settings: settings
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Test Response:\n\n' + data.response);
      } else {
        alert('Error testing AI: ' + data.error);
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      alert('Error testing AI response');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🤖 AI Settings</h1>
              <p className="text-sm text-gray-600">Configure your Email AI personality and behavior</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={testAIResponse}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🧪 Test AI Response
              </button>
              <Link 
                href="/email"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
              >
                ← Back to Email
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* AI Personality Settings */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Basic Personality */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">👤 AI Personality</h2>
              
              {/* Business Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={customer?.business_name || ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
                  disabled
                  placeholder="Set in profile settings"
                />
                <p className="text-xs text-gray-500 mt-1">Update in your profile settings</p>
              </div>

              {/* Tone */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Tone
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {['formal', 'professional', 'casual'].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setSettings({...settings, tone})}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        settings.tone === tone
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="capitalize font-medium">{tone}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expertise */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Expertise
                </label>
                <input
                  type="text"
                  value={settings.expertise}
                  onChange={(e) => setSettings({...settings, expertise: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Real Estate, Property Management, Home Sales"
                />
              </div>

              {/* Specialties */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                <textarea
                  value={settings.specialties}
                  onChange={(e) => setSettings({...settings, specialties: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Luxury homes, First-time buyers, Investment properties"
                />
              </div>

              {/* Response Style */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Style
                </label>
                <textarea
                  value={settings.response_style}
                  onChange={(e) => setSettings({...settings, response_style: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Helpful and detailed responses, Brief and to-the-point, Enthusiastic and encouraging"
                />
              </div>

              {/* Custom AI Personality */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions
                </label>
                <textarea
                  value={settings.ai_personality}
                  onChange={(e) => setSettings({...settings, ai_personality: e.target.value})}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional personality traits or instructions for the AI..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide specific instructions about how the AI should behave, what to emphasize, etc.
                </p>
              </div>
            </div>

            {/* Hot Lead Detection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">🔥 Hot Lead Detection</h2>
              
              {/* Keywords */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hot Lead Keywords
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.hot_lead_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomKeyword()}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add new keyword..."
                  />
                  <button
                    onClick={addCustomKeyword}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Keywords that indicate high buying intent and urgency
                </p>
              </div>
            </div>

            {/* Behavior Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">⚙️ AI Behavior</h2>
              
              <div className="space-y-4">
                {/* Auto Response */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Auto-Response</div>
                    <div className="text-sm text-gray-500">Automatically respond to emails</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_response_enabled}
                      onChange={(e) => setSettings({...settings, auto_response_enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Hot Lead Alerts */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Hot Lead Alerts</div>
                    <div className="text-sm text-gray-500">Send notifications for high-intent emails</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.alert_hot_leads}
                      onChange={(e) => setSettings({...settings, alert_hot_leads: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Include Availability */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Include Availability</div>
                    <div className="text-sm text-gray-500">Mention availability for meetings/viewings</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.include_availability}
                      onChange={(e) => setSettings({...settings, include_availability: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Ask Qualifying Questions */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Ask Qualifying Questions</div>
                    <div className="text-sm text-gray-500">Ask follow-up questions to qualify leads</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ask_qualifying_questions}
                      onChange={(e) => setSettings({...settings, ask_qualifying_questions: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Require Approval</div>
                    <div className="text-sm text-gray-500">Hold responses for manual approval</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.require_approval}
                      onChange={(e) => setSettings({...settings, require_approval: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Save Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <button
                onClick={saveAISettings}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save AI Settings'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={testAIResponse}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🧪 Test AI Response
                </button>
                <Link
                  href="/email/manage-templates"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
                >
                  📝 Manage Templates
                </Link>
                <Link
                  href="/email"
                  className="block w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
                >
                  📧 Email Manager
                </Link>
              </div>
            </div>

            {/* Help */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Tips</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <p>• Be specific about your expertise and specialties</p>
                <p>• Add keywords customers use when they're ready to buy</p>
                <p>• Test your AI responses regularly to ensure quality</p>
                <p>• Enable hot lead alerts to never miss urgent inquiries</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
