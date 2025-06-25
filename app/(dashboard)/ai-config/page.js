// app/(dashboard)/ai-config/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState(null);
  const [config, setConfig] = useState({
    openaiApiKey: '',
    aiPersonality: 'professional',
    aiTone: 'helpful',
    customInstructions: '',
    knowledgeBase: '',
    model: 'gpt-4',
    maxTokens: 200,
    temperature: 0.7
  });

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const response = await fetch('/api/businesses');
      const businesses = await response.json();
      const primaryBusiness = businesses.find(b => b.isPrimary) || businesses[0];
      
      if (primaryBusiness) {
        setBusiness(primaryBusiness);
        setConfig({
          openaiApiKey: primaryBusiness.openaiApiKey || '',
          aiPersonality: primaryBusiness.aiPersonality || 'professional',
          aiTone: primaryBusiness.aiTone || 'helpful',
          customInstructions: primaryBusiness.customInstructions || '',
          knowledgeBase: primaryBusiness.knowledgeBase || '',
          model: primaryBusiness.model || 'gpt-4',
          maxTokens: primaryBusiness.maxTokens || 200,
          temperature: primaryBusiness.temperature || 0.7
        });
      }
    } catch (error) {
      console.error('Error fetching business config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: business.id,
          ...config
        })
      });

      if (response.ok) {
        alert('AI configuration saved successfully!');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testAI = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Hello, I'm interested in learning about your services.",
          businessId: business.id,
          conversationHistory: []
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`AI Test Response:\n\n"${data.response}"\n\nProvider: ${data.aiProvider}`);
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      alert('AI test failed. Please check your configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
              <p className="text-gray-600">Customize your AI assistant for {business?.businessName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Back to Dashboard
              </button>
              <button
                onClick={testAI}
                disabled={saving}
                className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                🧪 Test AI
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* OpenAI API Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔑 OpenAI API Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig({...config, openaiApiKey: e.target.value})}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">OpenAI Platform</a>. 
                  {!config.openaiApiKey && " Without this, the AI will use basic fallback responses."}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => setConfig({...config, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gpt-4">GPT-4 (Higher Quality)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster/Cheaper)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Length
                  </label>
                  <select
                    value={config.maxTokens}
                    onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="100">Short (100 tokens)</option>
                    <option value="200">Medium (200 tokens)</option>
                    <option value="300">Long (300 tokens)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Creativity Level
                  </label>
                  <select
                    value={config.temperature}
                    onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0.3">Conservative (0.3)</option>
                    <option value="0.7">Balanced (0.7)</option>
                    <option value="1.0">Creative (1.0)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Personality Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🎭 AI Personality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Personality Style
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'professional', label: 'Professional', desc: 'Formal, polished, industry-focused' },
                    { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, conversational' },
                    { value: 'casual', label: 'Casual', desc: 'Relaxed, informal, personable' },
                    { value: 'expert', label: 'Expert', desc: 'Authoritative, detailed, technical' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="personality"
                        value={option.value}
                        checked={config.aiPersonality === option.value}
                        onChange={(e) => setConfig({...config, aiPersonality: e.target.value})}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Conversation Tone
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'helpful', label: 'Helpful', desc: 'Problem-solving focused' },
                    { value: 'sales-focused', label: 'Sales-Focused', desc: 'Guides toward business value' },
                    { value: 'consultative', label: 'Consultative', desc: 'Asks questions, understands needs' },
                    { value: 'educational', label: 'Educational', desc: 'Teaches and informs' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={option.value}
                        checked={config.aiTone === option.value}
                        onChange={(e) => setConfig({...config, aiTone: e.target.value})}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Custom Instructions</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional AI Instructions
              </label>
              <textarea
                rows={4}
                value={config.customInstructions}
                onChange={(e) => setConfig({...config, customInstructions: e.target.value})}
                placeholder="Add specific instructions for how your AI should behave. For example: 'Always mention our 30-day satisfaction guarantee' or 'Ask about timeline within first 3 messages'..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Knowledge Base */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🧠 Knowledge Base</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Knowledge & FAQs
              </label>
              <textarea
                rows={6}
                value={config.knowledgeBase}
                onChange={(e) => setConfig({...config, knowledgeBase: e.target.value})}
                placeholder="Add specific information about your business, services, pricing, policies, FAQs, etc. This knowledge will be available to your AI assistant. For example:

Our Services:
- Home buying assistance
- Property valuation
- Market analysis

Our Process:
1. Initial consultation (free)
2. Property search
3. Negotiation and closing

Pricing:
- Buyer representation: No upfront cost
- Seller representation: 3% commission

Common Questions:
Q: How long does the buying process take?
A: Typically 30-45 days from offer to closing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This information will be included in every conversation to help your AI provide accurate, specific answers about your business.
              </p>
            </div>
          </div>

          {/* Status & Testing */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 AI Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${config.openaiApiKey ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div className="text-sm font-medium text-gray-900">
                  {config.openaiApiKey ? 'OpenAI Connected' : 'Using Fallback'}
                </div>
                <div className="text-xs text-gray-600">
                  {config.openaiApiKey ? 'Real AI responses enabled' : 'Add API key for full AI'}
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                <div className="text-sm font-medium text-gray-900">
                  Personality: {config.aiPersonality}
                </div>
                <div className="text-xs text-gray-600">
                  Tone: {config.aiTone}
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${config.knowledgeBase ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div className="text-sm font-medium text-gray-900">
                  Knowledge Base
                </div>
                <div className="text-xs text-gray-600">
                  {config.knowledgeBase ? `${config.knowledgeBase.length} characters` : 'Not configured'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
