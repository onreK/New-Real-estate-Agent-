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
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium capitalize">{tone}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tone === 'formal' && 'Very polite, structured'}
                        {tone === 'professional' && 'Friendly but business-like'}
                        {tone === 'casual' && 'Relaxed, conversational'}
                      </div>
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
                  placeholder="e.g., Residential Real Estate, Commercial Properties, Luxury Homes"
                />
              </div>

              {/* Specialties */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                <input
                  type="text"
                  value={settings.specialties}
                  onChange={(e) => setSettings({...settings, specialties: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., First-time buyers, Investment properties, Foreclosures"
                />
              </div>

              {/* Response Style */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Style Description
                </label>
                <textarea
                  value={settings.response_style}
                  onChange={(e) => setSettings({...settings, response_style: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="e.g., Helpful and detailed responses with quick availability offers, always mention next steps"
                />
              </div>
            </div>

            {/* Hot Lead Keywords */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">🔥 Hot Lead Detection</h2>
              
              <p className="text-gray-600 mb-4">
                These keywords will trigger immediate alerts when found in customer emails:
              </p>

              {/* Current Keywords */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {settings.hot_lead_keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
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
              </div>

              {/* Add New Keyword */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomKeyword()}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add keyword (e.g., 'ready to buy', 'cash offer')"
                />
                <button
                  onClick={addCustomKeyword}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Auto-Response Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">⚡ Auto-Response Settings</h2>
              
              <div className="space-y-4">
                {/* Auto Response Enabled */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Send AI responses automatically</h3>
                    <p className="text-sm text-gray-500">AI will respond to emails within 30 seconds</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, auto_response_enabled: !settings.auto_response_enabled})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.auto_response_enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.auto_response_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Hot Lead Alerts */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Alert me for hot leads</h3>
                    <p className="text-sm text-gray-500">Get immediate notifications for urgent emails</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, alert_hot_leads: !settings.alert_hot_leads})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.alert_hot_leads ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.alert_hot_leads ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Include Availability */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Include viewing availability</h3>
                    <p className="text-sm text-gray-500">AI mentions your availability for showings</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, include_availability: !settings.include_availability})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.include_availability ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.include_availability ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Ask Qualifying Questions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Ask qualifying questions</h3>
                    <p className="text-sm text-gray-500">AI asks about budget, timeline, preferences</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, ask_qualifying_questions: !settings.ask_qualifying_questions})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.ask_qualifying_questions ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.ask_qualifying_questions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Require approval before sending</h3>
                    <p className="text-sm text-gray-500">Review AI responses before they're sent</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, require_approval: !settings.require_approval})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.require_approval ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.require_approval ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Preview</h3>
              
              <div className="space-y-4">
                {/* Sample Email */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Sample Customer Email:</div>
                  <div className="text-sm text-gray-800">
                    "Hi! I'm urgently looking for a 3-bedroom house under $500K. Can you help me ASAP?"
                  </div>
                </div>

                {/* AI Response Preview */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-2">AI Response Preview:</div>
                  <div className="text-sm text-gray-800">
                    Thank you for reaching out! I'd be delighted to help you find the perfect 3-bedroom home under $500K.
                    
                    {settings.include_availability && (
                      <div className="mt-2">
                        I have availability this week for property viewings and can arrange showings quickly.
                      </div>
                    )}
                    
                    {settings.ask_qualifying_questions && (
                      <div className="mt-2">
                        To find the best options for you, could you let me know your preferred area and any specific features you're looking for?
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-blue-500">
                      🔥 This would trigger a hot lead alert (contains "urgently" and "ASAP")
                    </div>
                  </div>
                </div>

                {/* Current Settings Summary */}
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">Current Settings:</div>
                  <div className="space-y-1 text-xs">
                    <div>Tone: <span className="font-medium capitalize">{settings.tone}</span></div>
                    <div>Auto-response: <span className="font-medium">{settings.auto_response_enabled ? 'On' : 'Off'}</span></div>
                    <div>Hot lead alerts: <span className="font-medium">{settings.alert_hot_leads ? 'On' : 'Off'}</span></div>
                    <div>Keywords: <span className="font-medium">{settings.hot_lead_keywords.length} active</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end space-x-4">
          <Link
            href="/email"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={saveAISettings}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
