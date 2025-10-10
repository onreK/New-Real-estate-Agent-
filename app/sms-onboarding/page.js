'use client';

import { useState } from 'react';
import { Check, Phone, Settings, Zap, AlertCircle } from 'lucide-react';

export default function SMSOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState('');

  // Sample available numbers (will be replaced by API call once Twilio is approved)
  const [availableNumbers] = useState([
    { phoneNumber: '+18045551234', locality: 'Richmond', region: 'VA' },
    { phoneNumber: '+18045555678', locality: 'Virginia Beach', region: 'VA' },
    { phoneNumber: '+18045559012', locality: 'Norfolk', region: 'VA' }
  ]);

  const [selectedNumber, setSelectedNumber] = useState('');
  const [smsConfig, setSmsConfig] = useState({
    businessName: '',
    businessInfo: '',
    personality: 'professional',
    welcomeMessage: '',
    enableHotLeadAlerts: true,
    businessOwnerPhone: '',
    alertBusinessHours: true
  });

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!selectedNumber) {
          setError('Please select a phone number');
          return false;
        }
        break;
      case 2:
        if (!smsConfig.businessName.trim()) {
          setError('Business name is required');
          return false;
        }
        if (!smsConfig.businessInfo.trim()) {
          setError('Business information is required');
          return false;
        }
        break;
      case 3:
        if (smsConfig.enableHotLeadAlerts && !smsConfig.businessOwnerPhone.trim()) {
          setError('Your phone number is required for hot lead alerts');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handlePurchaseAndSetup = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    setError('');

    try {
      // Simulate setup process
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🚀 SMS Setup Configuration:', {
        phoneNumber: selectedNumber,
        config: smsConfig
      });

      // Here you would call your API endpoints:
      // 1. POST /api/customer-sms/purchase-number
      // 2. POST /api/customer-sms/configure-ai
      // 3. POST /api/customer-sms/test

      setSetupComplete(true);
    } catch (err) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const areaCode = cleaned.slice(1, 4);
      const exchange = cleaned.slice(4, 7);
      const suffix = cleaned.slice(7);
      return `+1 (${areaCode}) ${exchange}-${suffix}`;
    }
    return number;
  };

  // Success Screen
  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-green-200">
            <div className="text-7xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-green-600 mb-4">
              SMS AI Setup Complete!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Your intelligent SMS assistant is ready to engage with customers 24/7
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-gray-900">Your Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">📱 SMS Number:</span>
                    <span className="font-mono text-gray-900">{formatPhoneNumber(selectedNumber)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">🏢 Business:</span>
                    <span className="text-gray-900">{smsConfig.businessName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">🤖 Personality:</span>
                    <span className="text-gray-900 capitalize">{smsConfig.personality}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">🔥 Hot Alerts:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      smsConfig.enableHotLeadAlerts 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {smsConfig.enableHotLeadAlerts ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {smsConfig.enableHotLeadAlerts && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">📞 Alert Phone:</span>
                        <span className="text-gray-900">{smsConfig.businessOwnerPhone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">🕐 Hours:</span>
                        <span className="text-gray-900">
                          {smsConfig.alertBusinessHours ? 'Business Hours' : '24/7'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-3xl mb-2">💬</div>
                <div className="font-semibold text-gray-900">Instant Responses</div>
                <div className="text-sm text-gray-600">AI replies in seconds</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold text-gray-900">Lead Qualification</div>
                <div className="text-sm text-gray-600">Auto-scores every lead</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-3xl mb-2">🔥</div>
                <div className="font-semibold text-gray-900">Hot Lead Alerts</div>
                <div className="text-sm text-gray-600">Instant notifications</div>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/sms'}
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium shadow-lg hover:shadow-xl"
            >
              Go to SMS Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Onboarding Flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 SMS AI Setup</h1>
          <p className="text-gray-600 text-lg">Launch your intelligent SMS assistant in 4 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Choose Number</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Configure AI</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Hot Lead Alerts</span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Review & Launch</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-8">
            {/* Step 1: Choose Phone Number */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Choose Your SMS Number</h2>
                  </div>
                  <p className="text-gray-600">
                    Select a phone number for your business SMS assistant. This will be the number your customers text.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableNumbers.map((number) => (
                    <button
                      key={number.phoneNumber}
                      onClick={() => setSelectedNumber(number.phoneNumber)}
                      className={`p-6 border-2 rounded-lg transition-all text-left ${
                        selectedNumber === number.phoneNumber
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xl font-bold text-gray-900 mb-2">
                        {formatPhoneNumber(number.phoneNumber)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {number.locality}, {number.region}
                      </div>
                      <div className="mt-3 text-sm font-medium text-blue-600">
                        $1/month
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">What you get:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Dedicated business phone number</li>
                        <li>• SMS and MMS messaging enabled</li>
                        <li>• Instant message delivery</li>
                        <li>• Keep your number forever</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configure AI */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Settings className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Configure AI Assistant</h2>
                  </div>
                  <p className="text-gray-600">
                    Customize how your AI assistant represents your business and responds to customers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={smsConfig.businessName}
                      onChange={(e) => setSmsConfig({...smsConfig, businessName: e.target.value})}
                      placeholder="e.g., Amanda's Real Estate"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Personality
                    </label>
                    <select
                      value={smsConfig.personality}
                      onChange={(e) => setSmsConfig({...smsConfig, personality: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="expert">Expert</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="empathetic">Empathetic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Information *
                  </label>
                  <textarea
                    value={smsConfig.businessInfo}
                    onChange={(e) => setSmsConfig({...smsConfig, businessInfo: e.target.value})}
                    placeholder="Describe your business, services, hours, and key information the AI should know..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Tip: Include services, pricing, hours, locations, and common customer questions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={smsConfig.welcomeMessage}
                    onChange={(e) => setSmsConfig({...smsConfig, welcomeMessage: e.target.value})}
                    placeholder="Hi! Thanks for reaching out. How can I help you today?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Hot Lead Alerts */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Zap className="w-6 h-6 text-orange-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Hot Lead Alerts</h2>
                  </div>
                  <p className="text-gray-600">
                    Get instant SMS alerts when the AI detects high-intent customers ready to buy.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="text-4xl">🔥</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Never Miss a Hot Lead</h3>
                      <p className="text-gray-700 text-sm">
                        Our AI analyzes every conversation in real-time and instantly alerts you when it detects:
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span><strong>High buying intent</strong> - Ready to purchase or schedule</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span><strong>Specific requirements</strong> - Clear budget, timeline, or needs</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span><strong>Urgency signals</strong> - Time-sensitive language or requests</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span><strong>Decision-making authority</strong> - Direct decision maker</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="enableAlerts"
                      checked={smsConfig.enableHotLeadAlerts}
                      onChange={(e) => setSmsConfig({...smsConfig, enableHotLeadAlerts: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="enableAlerts" className="text-base font-medium text-gray-900">
                      ✅ Enable Hot Lead Alerts (Recommended)
                    </label>
                  </div>

                  {smsConfig.enableHotLeadAlerts && (
                    <div className="ml-8 space-y-4 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Phone Number (for alerts) *
                        </label>
                        <input
                          type="tel"
                          value={smsConfig.businessOwnerPhone}
                          onChange={(e) => setSmsConfig({...smsConfig, businessOwnerPhone: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          This is where you'll receive instant SMS alerts about hot leads
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="businessHours"
                          checked={smsConfig.alertBusinessHours}
                          onChange={(e) => setSmsConfig({...smsConfig, alertBusinessHours: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="businessHours" className="text-sm text-gray-700">
                          🕐 Only send alerts during business hours (8 AM - 6 PM, Mon-Fri)
                        </label>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">Alert Example:</h4>
                        <div className="bg-white rounded p-3 text-sm text-gray-700">
                          🔥 <strong>HOT LEAD ALERT!</strong><br /><br />
                          Score: 9/10<br />
                          From: +1 (555) 987-6543<br />
                          Message: "I'm looking to buy a 3-bed home in Richmond under $400k..."<br /><br />
                          Reason: High intent, specific budget, ready to buy<br /><br />
                          {smsConfig.businessName || 'Your Business'} AI Assistant
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review & Launch */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">🚀 Review & Launch</h2>
                  <p className="text-gray-600">
                    Review your configuration and launch your SMS AI assistant.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Your SMS AI Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">📱 SMS Setup</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Number:</span>
                          <span className="font-medium text-gray-900">{formatPhoneNumber(selectedNumber)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Business:</span>
                          <span className="font-medium text-gray-900">{smsConfig.businessName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Personality:</span>
                          <span className="font-medium text-gray-900 capitalize">{smsConfig.personality}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">🔥 Hot Lead Alerts</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`font-medium ${smsConfig.enableHotLeadAlerts ? 'text-green-600' : 'text-gray-600'}`}>
                            {smsConfig.enableHotLeadAlerts ? '✅ Enabled' : '❌ Disabled'}
                          </span>
                        </div>
                        {smsConfig.enableHotLeadAlerts && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Alert Phone:</span>
                              <span className="font-medium text-gray-900">{smsConfig.businessOwnerPhone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hours:</span>
                              <span className="font-medium text-gray-900">
                                {smsConfig.alertBusinessHours ? 'Business Hours' : '24/7'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📝 Business Info</h4>
                    <p className="text-sm text-gray-600 line-clamp-3">{smsConfig.businessInfo}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-2">⏳ Waiting for Twilio Approval</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Since you're still waiting for Twilio SMS campaign approval, clicking "Launch" will save your 
                        configuration but won't activate the number yet. Once Twilio approves, everything will activate automatically!
                      </p>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <p>✅ Configuration will be saved</p>
                        <p>⏳ Number purchase pending approval</p>
                        <p>🚀 Auto-activates when approved</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🎉 What happens after launch:</h4>
                  <ol className="text-sm text-green-800 space-y-2">
                    <li>1. ✅ Your configuration is saved</li>
                    <li>2. ⏳ Waiting for Twilio SMS campaign approval</li>
                    <li>3. 🚀 Once approved, your number activates automatically</li>
                    <li>4. 💬 Customers can start texting</li>
                    <li>5. 🔥 Hot lead alerts begin working</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 p-6 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handlePurchaseAndSetup}
                disabled={isLoading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
