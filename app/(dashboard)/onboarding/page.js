'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    siteType: 'fullsite', // Default to full site
    businessName: '',
    industry: 'real-estate',
    subdomain: '',
    ownerName: user?.fullName || '',
    email: user?.emailAddresses?.[0]?.emailAddress || '',
    phone: '',
    primaryColor: '#3B82F6',
    businessDescription: '',
    heroText: '',
    aboutText: '',
    services: '',
    calendlyUrl: '',
    googleSheetUrl: ''
  });

  // Wait for user to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user, redirect to sign-in
  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const industries = [
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'dental', label: 'Dental Practice' },
    { value: 'legal', label: 'Legal Services' },
    { value: 'auto-repair', label: 'Auto Repair' },
    { value: 'fitness', label: 'Fitness/Gym' },
    { value: 'medical', label: 'Medical Practice' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate subdomain from business name
    if (name === 'businessName') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);
      setFormData(prev => ({
        ...prev,
        subdomain,
        heroText: `Welcome to ${value}`,
        businessDescription: `Professional ${prev.industry.replace('-', ' ')} services you can trust.`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('=== FORM SUBMIT STARTED ===');
    setLoading(true);

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log('Business created, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert('Error creating business: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    console.log('Next clicked - current step:', step);
    setStep(step + 1);
  };

  const handleBack = () => {
    console.log('Back clicked - current step:', step);
    setStep(step - 1);
  };

  // Simple step validation
  const canProceed = () => {
    if (step === 2) return formData.businessName && formData.subdomain;
    return true;
  };

  // Determine if we should show submit button
  const showSubmitButton = () => {
    if (formData.siteType === 'widget') {
      return step === 4; // Widget: Steps 1,2,3,4 (Site Type, Business, Branding, Setup)
    } else {
      return step === 5; // Fullsite: Steps 1,2,3,4,5 (Site Type, Business, Branding, Content, Setup)
    }
  };

  const maxSteps = formData.siteType === 'widget' ? 4 : 5;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to AI Business Automation!</h1>
            <p className="text-gray-600 mt-2">Let's set up your AI assistant in just a few steps.</p>
            <p className="text-sm text-blue-600 mt-1">Signed in as: {user.emailAddresses?.[0]?.emailAddress}</p>
            <p className="text-xs text-red-500">DEBUG: Step {step} of {maxSteps} | Site Type: {formData.siteType}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center">
              {Array.from({ length: maxSteps }, (_, i) => (
                <div 
                  key={i}
                  className={`flex-1 h-2 ${i === 0 ? 'rounded-l-full' : ''} ${i === maxSteps - 1 ? 'rounded-r-full' : ''} ${
                    step > i + 1 ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>Site Type</span>
              <span>Business Info</span>
              <span>Branding</span>
              {formData.siteType === 'fullsite' && <span>Content</span>}
              <span>Setup</span>
            </div>
          </div>

          {/* STEP 1: Site Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Setup</h2>
              <p className="text-gray-600">How do you want to use your AI assistant?</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Widget Option */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    formData.siteType === 'widget' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, siteType: 'widget' }))}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🔗</div>
                    <h3 className="text-lg font-semibold mb-2">Widget for Existing Site</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      I have a website. I just want to add an AI chatbot widget.
                    </p>
                    <div className="text-sm text-green-600 font-medium">Starting at $97/month</div>
                  </div>
                </div>

                {/* Full Site Option */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    formData.siteType === 'fullsite' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, siteType: 'fullsite' }))}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏠</div>
                    <h3 className="text-lg font-semibold mb-2">Complete Website + AI</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      I need a full business website with integrated AI assistant.
                    </p>
                    <div className="text-sm text-green-600 font-medium">Starting at $197/month</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  {formData.siteType === 'widget' ? '🔗 Widget Setup' : '🏠 Full Website Setup'}
                </h4>
                <p className="text-blue-800 text-sm">
                  {formData.siteType === 'widget' 
                    ? 'You\'ll get embeddable code to add to your existing website, plus a demo page to test and manage your AI assistant.'
                    : 'You\'ll get a complete business website with integrated AI assistant, contact forms, and lead management.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Business Information */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Amanda's Real Estate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {industries.map(industry => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.siteType === 'widget' ? 'Admin/Demo Subdomain *' : 'Website Subdomain *'}
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="subdomain"
                    value={formData.subdomain}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="your-business"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                    .yoursite.com
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formData.siteType === 'widget' 
                    ? 'This will be your admin dashboard and demo page URL'
                    : 'This will be your complete business website URL'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Branding */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Branding</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleInputChange}
                    className="w-12 h-12 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({...prev, primaryColor: e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">This will be used for buttons and highlights</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
                <div className="bg-white p-4 rounded border">
                  <div className="flex items-center space-x-2 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      🤖
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{formData.businessName || 'Your Business'} AI Assistant</div>
                      <div className="text-xs text-green-500">● Online</div>
                    </div>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg text-sm">
                    Hi! I'm {formData.ownerName || 'Your'}'s AI assistant. How can I help you today?
                  </div>
                  <button 
                    type="button"
                    className="text-white px-4 py-2 rounded mt-3 text-sm"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Website Content (Full Site Only) */}
          {step === 4 && formData.siteType === 'fullsite' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Website Content</h2>
              <p className="text-gray-600">Let's add some content for your business website</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Text (Main headline)
                </label>
                <input
                  type="text"
                  name="heroText"
                  value={formData.heroText}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Welcome to Amanda's Real Estate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  name="businessDescription"
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Professional real estate services you can trust..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services (one per line)
                </label>
                <textarea
                  name="services"
                  value={formData.services}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Home Buying&#10;Home Selling&#10;Market Analysis&#10;First-time Buyer Support"
                />
              </div>
            </div>
          )}

          {/* STEP 4 (Widget) OR STEP 5 (Fullsite): Integrations */}
          {((step === 4 && formData.siteType === 'widget') || (step === 5 && formData.siteType === 'fullsite')) && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
              <p className="text-gray-600">Connect your existing tools (optional - you can set these up later)</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calendly URL (for appointment booking)
                </label>
                <input
                  type="url"
                  name="calendlyUrl"
                  value={formData.calendlyUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://calendly.com/your-username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Sheet URL (for lead tracking)
                </label>
                <input
                  type="url"
                  name="googleSheetUrl"
                  value={formData.googleSheetUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">🎉 Almost Ready!</h3>
                <p className="text-blue-800 text-sm">
                  After setup, you'll get:
                  {formData.siteType === 'widget' ? (
                    <>
                      <br/>• Embeddable widget code for your website
                      <br/>• Admin dashboard at: <strong>{formData.subdomain}.yoursite.com</strong>
                      <br/>• Demo page to test your AI assistant
                    </>
                  ) : (
                    <>
                      <br/>• Complete business website at: <strong>{formData.subdomain}.yoursite.com</strong>
                      <br/>• Integrated AI assistant
                      <br/>• Lead capture and management
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
            
            {!showSubmitButton() ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-auto"
                disabled={!canProceed()}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto disabled:opacity-50"
              >
                {loading ? 'Creating Your Business...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
