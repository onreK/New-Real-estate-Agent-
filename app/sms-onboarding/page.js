'use client';

import { useState, useEffect } from 'react';

export default function SMSOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [smsConfig, setSmsConfig] = useState({
    personality: 'professional',
    businessName: '',
    businessInfo: '',
    welcomeMessage: '',
    businessOwnerPhone: '',
    enableHotLeadAlerts: true,
    alertBusinessHours: true
  });
  const [testResults, setTestResults] = useState(null);

  const steps = [
    { id: 1, name: 'Choose Number', desc: 'Select your business SMS number' },
    { id: 2, name: 'Configure AI', desc: 'Set up your AI personality' },
    { id: 3, name: 'Test SMS', desc: 'Test your SMS AI responses' },
    { id: 4, name: 'Go Live', desc: 'Activate SMS AI for customers' }
  ];

  useEffect(() => {
    if (currentStep === 1) {
      loadAvailableNumbers();
    }
  }, [currentStep]);

  const loadAvailableNumbers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer-sms/available-numbers');
      if (response.ok) {
        const data = await response.json();
        setAvailableNumbers(data.numbers);
      }
    } catch (error) {
      console.error('Error loading numbers:', error);
    }
    setIsLoading(false);
  };

  const purchaseNumber = async (number) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer-sms/purchase-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: number })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedNumber(data.phoneNumber);
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error purchasing number:', error);
    }
    setIsLoading(false);
  };

  const saveAIConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer-sms/configure-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber,
          config: smsConfig
        })
      });
      
      if (response.ok) {
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
    setIsLoading(false);
  };

  const testSMS = async (testMessage) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer-sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber,
          message: testMessage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      }
    } catch (error) {
      console.error('Error testing SMS:', error);
    }
    setIsLoading(false);
  };

  const goLive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer-sms/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber
        })
      });
      
      if (response.ok) {
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Error activating SMS:', error);
    }
    setIsLoading(false);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">📱 Add SMS AI to Your Plan</h1>
              <div className="text-sm text-gray-500">
                Upgrade to Pro: $299/month
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step.id <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-sm font-medium ${
                      step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500">{step.desc}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-1 mx-4 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6">
            {/* Step 1: Choose Number */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Choose Your Business SMS Number</h2>
                  <p className="text-gray-600 mb-6">
                    Select a phone number for your customers to text. This will be your dedicated SMS AI number.
                  </p>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading available numbers...</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {availableNumbers.map((number, index) => (
                      <div 
                        key={index}
                        className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                        onClick={() => purchaseNumber(number)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-lg">
                              {formatPhoneNumber(number.phoneNumber)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {number.locality}, {number.region}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">$1.15/month</div>
                            <div className="text-xs text-gray-500">SMS enabled</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Configure AI */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Configure Your SMS AI</h2>
                  <p className="text-gray-600 mb-6">
                    Set up how your AI will respond to customer text messages.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Name</label>
                    <input
                      type="text"
                      value={smsConfig.businessName}
                      onChange={(e) => setSmsConfig({...smsConfig, businessName: e.target.value})}
                      placeholder="Your Business Name"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">AI Personality</label>
                    <select
                      value={smsConfig.personality}
                      onChange={(e) => setSmsConfig({...smsConfig, personality: e.target.value})}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="professional">Professional & Direct</option>
                      <option value="friendly">Friendly & Conversational</option>
                      <option value="enthusiastic">Enthusiastic & Energetic</option>
                      <option value="empathetic">Empathetic & Understanding</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Business Information</label>
                    <textarea
                      value={smsConfig.businessInfo}
                      onChange={(e) => setSmsConfig({...smsConfig, businessInfo: e.target.value})}
                      placeholder="Describe your business, services, hours, pricing, etc. This helps the AI provide accurate information to customers."
                      className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Welcome Message (Optional)</label>
                    <input
                      type="text"
                      value={smsConfig.welcomeMessage}
                      onChange={(e) => setSmsConfig({...smsConfig, welcomeMessage: e.target.value})}
                      placeholder="Hi! Thanks for texting us. How can I help you today?"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Hot Lead Alerts Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">🔥 Hot Lead Alerts</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Get instant SMS alerts when AI detects a high-intent customer ready to buy.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="enableAlerts"
                          checked={smsConfig.enableHotLeadAlerts}
                          onChange={(e) => setSmsConfig({...smsConfig, enableHotLeadAlerts: e.target.checked})}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <label htmlFor="enableAlerts" className="text-sm font-medium">
                          Enable hot lead alerts
                        </label>
                      </div>

                      {smsConfig.enableHotLeadAlerts && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Your Cell Phone (for alerts) *
                            </label>
                            <input
                              type="tel"
                              value={smsConfig.businessOwnerPhone}
                              onChange={(e) => setSmsConfig({...smsConfig, businessOwnerPhone: e.target.value})}
                              placeholder="+1 (555) 123-4567"
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              required={smsConfig.enableHotLeadAlerts}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              You'll receive SMS alerts when customers show high buying intent
                            </p>
                          </div>

                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="businessHours"
                              checked={smsConfig.alertBusinessHours}
                              onChange={(e) => setSmsConfig({...smsConfig, alertBusinessHours: e.target.checked})}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <label htmlFor="businessHours" className="text-sm">
                              Only send alerts during business hours (9 AM - 8 PM)
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={saveAIConfig}
                  disabled={isLoading || !smsConfig.businessName || !smsConfig.businessInfo || (smsConfig.enableHotLeadAlerts && !smsConfig.businessOwnerPhone)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Continue to Testing'}
                </button>
              </div>
            )}

            {/* Step 3: Test SMS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Test Your SMS AI</h2>
                  <p className="text-gray-600 mb-6">
                    Send test messages to see how your AI will respond to customers.
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-blue-800 font-medium">Your SMS Number:</span>
                    <span className="ml-2 font-mono text-blue-900">
                      {formatPhoneNumber(selectedNumber?.phoneNumber)}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Customers will text this number to interact with your AI assistant.
                  </p>
                </div>

                {/* Hot Lead Test Section */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">🔥 Test Hot Lead Detection</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Try these phrases to see how the AI detects high-intent customers:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "I want to buy a house today",
                      "Ready to purchase, what's available?",
                      "My budget is $500K, let's do this",
                      "Can you call me? I need help ASAP"
                    ].map((phrase, index) => (
                      <button
                        key={index}
                        onClick={() => testSMS(phrase)}
                        disabled={isLoading}
                        className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        Test: "{phrase.substring(0, 25)}..."
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {['What are your hours?', 'How much does it cost?', 'Can I schedule an appointment?'].map((sample, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Test Message:</span>
                        <button
                          onClick={() => testSMS(sample)}
                          disabled={isLoading}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          Test
                        </button>
                      </div>
                      <p className="text-gray-700 mb-2">"{sample}"</p>
                      {testResults && testResults.testMessage === sample && (
                        <div className="bg-gray-50 p-3 rounded mt-2">
                          <span className="text-sm font-medium text-gray-600">AI Response:</span>
                          <p className="text-gray-800 mt-1">{testResults.response}</p>
                          {testResults.metadata?.leadScore && (
                            <p className="text-xs text-orange-600 mt-1">
                              Lead Score: {testResults.metadata.leadScore}/10
                              {testResults.metadata.leadScore >= 7 && " 🔥 HOT LEAD!"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Continue to Activation
                </button>
              </div>
            )}

            {/* Step 4: Go Live */}
            {currentStep === 4 && (
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-xl font-semibold mb-2">🎉 Ready to Go Live!</h2>
                  <p className="text-gray-600 mb-6">
                    Your SMS AI is configured and ready to help your customers.
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-4">Your SMS AI Setup</h3>
                  <div className="space-y-2 text-sm text-green-700">
                    <p><strong>Phone Number:</strong> {formatPhoneNumber(selectedNumber?.phoneNumber)}</p>
                    <p><strong>Business:</strong> {smsConfig.businessName}</p>
                    <p><strong>Personality:</strong> {smsConfig.personality}</p>
                    <p><strong>Hot Lead Alerts:</strong> {smsConfig.enableHotLeadAlerts ? `✅ Enabled (${smsConfig.businessOwnerPhone})` : '❌ Disabled'}</p>
                    <p><strong>Status:</strong> Ready to activate</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={goLive}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Activating...' : '🚀 Activate SMS AI'}
                  </button>

                  <div className="flex justify-center space-x-4 text-sm">
                    <a href="/customer-sms-dashboard" className="text-blue-600 hover:underline">
                      Go to SMS Dashboard
                    </a>
                    <a href="/dashboard" className="text-gray-600 hover:underline">
                      Back to Main Dashboard
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
