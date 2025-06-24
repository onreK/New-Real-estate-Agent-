// app/(dashboard)/onboarding/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    businessType: '',
    aiFeatures: [],
    businessDescription: '',
    targetAudience: ''
  });

  const industries = [
    'Real Estate', 'Healthcare', 'Legal Services', 'Financial Services',
    'E-commerce', 'SaaS/Technology', 'Education', 'Consulting',
    'Marketing Agency', 'Restaurant/Food', 'Fitness/Wellness', 'Other'
  ];

  const businessTypes = [
    { 
      id: 'ai-only', 
      name: 'AI Assistant Only', 
      description: 'Get started with AI chatbot and voice agent',
      features: ['AI Chatbot', 'Voice Agent', 'Lead Management', 'Analytics'],
      popular: true
    }
  ];

  const aiFeatures = [
    { id: 'chatbot', name: 'AI Chatbot', description: 'Intelligent chat for your website' },
    { id: 'voice', name: 'AI Voice Agent', description: 'Phone-based AI assistant' },
    { id: 'lead-scoring', name: 'Lead Scoring', description: 'AI-powered lead qualification' },
    { id: 'automation', name: 'Smart Automation', description: 'Automated follow-ups and nurturing' },
    { id: 'analytics', name: 'AI Analytics', description: 'Intelligent insights and reporting' },
    { id: 'integration', name: 'CRM Integration', description: 'Connect with existing tools' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (featureId) => {
    setFormData(prev => ({
      ...prev,
      aiFeatures: prev.aiFeatures.includes(featureId)
        ? prev.aiFeatures.filter(id => id !== featureId)
        : [...prev.aiFeatures, featureId]
    }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save business data
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          businessType: 'ai-only',
          onboardingCompleted: true
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        console.error('Failed to save business data');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return formData.businessName.trim().length > 0;
      case 2: return formData.industry.length > 0;
      case 3: return formData.businessType.length > 0;
      case 4: return formData.aiFeatures.length > 0;
      case 5: return formData.businessDescription.trim().length > 0;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your AI Customer Engagement Platform
          </h1>
          <p className="text-gray-600">
            Let's set up your AI-powered business automation in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 5</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Step 1: Business Name */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What's your business name?</h2>
              <p className="text-gray-600 mb-6">This will be used across your AI assistant and dashboard.</p>
              <input
                type="text"
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Industry */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What industry are you in?</h2>
              <p className="text-gray-600 mb-6">This helps us customize your AI assistant's knowledge.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {industries.map((industry) => (
                  <button
                    key={industry}
                    onClick={() => handleInputChange('industry', industry)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      formData.industry === industry
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Business Type (AI Only) */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your AI Solution</h2>
              <p className="text-gray-600 mb-6">Start with our comprehensive AI customer engagement platform.</p>
              <div className="space-y-4">
                {businessTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleInputChange('businessType', type.id)}
                    className={`relative p-6 border rounded-lg cursor-pointer transition-all ${
                      formData.businessType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {type.popular && (
                      <span className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-start">
                      <div className={`mt-1 w-4 h-4 rounded-full border-2 mr-4 ${
                        formData.businessType === type.id ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.businessType === type.id && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.name}</h3>
                        <p className="text-gray-600 mb-3">{type.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature) => (
                            <span key={feature} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: AI Features */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Your AI Features</h2>
              <p className="text-gray-600 mb-6">Choose the AI capabilities you want to enable (you can add more later).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    onClick={() => handleFeatureToggle(feature.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.aiFeatures.includes(feature.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`mt-1 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        formData.aiFeatures.includes(feature.id) 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.aiFeatures.includes(feature.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Business Description */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tell us about your business</h2>
              <p className="text-gray-600 mb-6">This helps train your AI assistant to better represent your business.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what your business does, your services, and what makes you unique..."
                    value={formData.businessDescription}
                    onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Who are your ideal customers?"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg font-medium ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Previous
            </button>
            
            {currentStep === 5 ? (
              <button
                onClick={completeOnboarding}
                disabled={!isStepValid()}
                className={`px-8 py-2 rounded-lg font-medium transition-colors ${
                  isStepValid()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Complete Setup
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!isStepValid()}
                className={`px-8 py-2 rounded-lg font-medium transition-colors ${
                  isStepValid()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
