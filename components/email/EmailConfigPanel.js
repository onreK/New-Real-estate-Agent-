// components/email/EmailConfigPanel.jsx
// Email configuration component that matches your existing UI style

import React, { useState } from 'react';
import { Mail, Brain, Settings, Zap } from 'lucide-react';

const EmailConfigPanel = () => {
  const [emailPersonality, setEmailPersonality] = useState('Professional & Friendly');
  const [emailModel, setEmailModel] = useState('gpt-4o-mini');
  const [creativityLevel, setCreativityLevel] = useState(0.6);
  const [emailLength, setEmailLength] = useState('Medium (200-300 words)');
  const [campaignType, setCampaignType] = useState('Lead Nurturing');
  const [subjectLineStyle, setSubjectLineStyle] = useState('Engaging & Curiosity-driven');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleSaveConfig = async () => {
    try {
      const config = {
        personality: emailPersonality,
        model: emailModel,
        creativityLevel,
        emailLength,
        campaignType,
        subjectLineStyle,
        knowledgeBase,
        customInstructions
      };

      // You can implement saving to your database here
      console.log('💾 Saving email config:', config);
      
      // For now, just show success
      alert('Email configuration saved successfully!');
    } catch (error) {
      console.error('❌ Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <Mail className="text-blue-600" size={32} />
          Email Automation Configuration
        </h1>
        <p className="text-gray-600">Customize how your AI creates and sends email campaigns</p>
      </div>

      {/* Email Personality Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-purple-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Email Personality</h2>
        </div>
        
        <select 
          value={emailPersonality}
          onChange={(e) => setEmailPersonality(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="Professional & Friendly">Professional & Friendly</option>
          <option value="Casual & Conversational">Casual & Conversational</option>
          <option value="Formal & Authoritative">Formal & Authoritative</option>
          <option value="Warm & Personal">Warm & Personal</option>
          <option value="Direct & Concise">Direct & Concise</option>
          <option value="Enthusiastic & Energetic">Enthusiastic & Energetic</option>
        </select>
      </div>

      {/* Campaign Strategy */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="text-orange-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Campaign Strategy</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Campaign Type</label>
            <select 
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Lead Nurturing">Lead Nurturing</option>
              <option value="Welcome Series">Welcome Series</option>
              <option value="Property Promotion">Property Promotion</option>
              <option value="Market Update">Market Update</option>
              <option value="Customer Retention">Customer Retention</option>
              <option value="Re-engagement">Re-engagement</option>
              <option value="Educational Content">Educational Content</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line Style</label>
            <select 
              value={subjectLineStyle}
              onChange={(e) => setSubjectLineStyle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Engaging & Curiosity-driven">Engaging & Curiosity-driven</option>
              <option value="Direct & Clear">Direct & Clear</option>
              <option value="Question-based">Question-based</option>
              <option value="Benefit-focused">Benefit-focused</option>
              <option value="Personalized">Personalized</option>
              <option value="Urgency-based">Urgency-based</option>
            </select>
          </div>
        </div>
      </div>

      {/* Business Knowledge Base */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-pink-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Email Knowledge Base</h2>
        </div>
        
        <textarea
          value={knowledgeBase}
          onChange={(e) => setKnowledgeBase(e.target.value)}
          placeholder="Add specific information about your real estate business, services, market areas, specialties, and key messaging for email campaigns. Include your value propositions, common customer questions, and any special offers or guarantees you want highlighted in emails."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Technical Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Technical Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
              <select 
                value={emailModel}
                onChange={(e) => setEmailModel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</option>
                <option value="gpt-4o">GPT-4o (Balanced Performance)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Premium Quality)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Length</label>
              <select 
                value={emailLength}
                onChange={(e) => setEmailLength(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Short (100-150 words)">Short (100-150 words)</option>
                <option value="Medium (200-300 words)">Medium (200-300 words)</option>
                <option value="Long (400-600 words)">Long (400-600 words)</option>
                <option value="Variable (AI Decides)">Variable (AI Decides)</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Email Creativity Level: {creativityLevel}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={creativityLevel}
                onChange={(e) => setCreativityLevel(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Features Enabled:</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Subject Line Optimization
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Personalization Engine
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Send Time Optimization
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Content Adaptation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Email Instructions */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="text-red-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Custom Email Instructions (Advanced)</h2>
        </div>
        
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="Optional: Add custom instructions for how the AI should write emails. For example: 'Always include market statistics', 'End with a specific call-to-action', 'Use local area terminology', etc. Leave blank to use default real estate best practices."
          className="w-full h-24 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Save Button */}
      <div className="text-center">
        <button 
          onClick={handleSaveConfig}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Save Email Configuration
        </button>
      </div>
    </div>
  );
};

export default EmailConfigPanel;
