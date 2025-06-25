'use client';

import { useState, useEffect } from 'react';

export default function AIConfigPage() {
  const [config, setConfig] = useState({
    personality: 'professional',
    knowledgeBase: '',
    model: 'gpt-4o-mini',
    creativity: 0.7,
    maxTokens: 500,
    systemPrompt: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/ai-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage('✅ Configuration saved successfully!');
      } else {
        setMessage('❌ Error saving configuration');
      }
    } catch (error) {
      setMessage('❌ Error saving configuration');
      console.error('Error:', error);
    }
    setIsLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🤖 AI Configuration</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-8">
          {/* Personality Section */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">🎭 AI Personality</h2>
            <select
              value={config.personality}
              onChange={(e) => setConfig({...config, personality: e.target.value})}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="professional">Professional & Direct</option>
              <option value="friendly">Friendly & Conversational</option>
              <option value="enthusiastic">Enthusiastic & Energetic</option>
              <option value="empathetic">Empathetic & Understanding</option>
              <option value="expert">Expert & Technical</option>
            </select>
          </div>

          {/* Knowledge Base Section */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">🧠 Knowledge Base</h2>
            <textarea
              value={config.knowledgeBase}
              onChange={(e) => setConfig({...config, knowledgeBase: e.target.value})}
              placeholder="Add specific information about your business, products, services, FAQs, etc. This will help the AI provide more accurate and relevant responses to your customers."
              className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Technical Settings */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">⚙️ Technical Settings</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">AI Model</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({...config, model: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</option>
                  <option value="gpt-4o">GPT-4o (Most Capable)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget-friendly)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Creativity Level: {config.creativity}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.creativity}
                  onChange={(e) => setConfig({...config, creativity: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Max Response Length</label>
              <select
                value={config.maxTokens}
                onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="150">Short (150 tokens)</option>
                <option value="300">Medium (300 tokens)</option>
                <option value="500">Long (500 tokens)</option>
                <option value="1000">Extended (1000 tokens)</option>
              </select>
            </div>
          </div>

          {/* Custom System Prompt */}
          <div>
            <h2 className="text-xl font-semibold mb-4">📝 Custom System Prompt (Advanced)</h2>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
              placeholder="Optional: Add custom instructions for how the AI should behave. Leave blank to use default personality-based prompts."
              className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <button
              onClick={saveConfig}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Saving...' : '💾 Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
