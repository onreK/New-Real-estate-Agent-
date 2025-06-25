'use client';

import { useState, useEffect } from 'react';

export default function SMSOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState('');

  const [smsConfig, setSmsConfig] = useState({
    personality: 'professional',
    businessName: '',
    businessInfo: '',
    welcomeMessage: '',
    businessOwnerPhone: '',
    enableHotLeadAlerts: true,
    alertBusinessHours: true,
    model: 'gpt-4o-mini',
    creativity: 0.7
  });

  // Load available phone numbers
  useEffect(() => {
    loadAvailableNumbers();
  }, []);

  const loadAvailableNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer-sms/available-numbers');
      const data = await response.json();
      
      if (data.success) {
        setAvailableNumbers(data.numbers || []);
      } else {
        setError(data.error || 'Failed to load available numbers');
      }
    } catch (error) {
      console.error('Error loading numbers:', error);
      setError('Failed to connect to SMS service');
    } finally {
      setIsLoading(false);
    }
  };

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
          setError('Business owner phone is required for hot lead alerts');
          return false;
        }
        if (smsConfig.businessOwnerPhone && !/^\+?[\d\s\-\(\)]+$/.test(smsConfig.businessOwnerPhone)) {
          setError('Please enter a valid phone number');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handlePurchaseAndSetup = async () => {
    if (!validateCurrentStep()) return;

    try {
      setIsLoading(true);
      setError('');

      // Step 1: Purchase the phone number
      console.log('🛒 Purchasing phone number:', selectedNumber);
      
      const purchaseResponse = await fetch('/api/customer-sms/purchase-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          customerId: 'demo_customer_' + Date.now()
        })
      });

      const purchaseData = await purchaseResponse.json();
      
      if (!purchaseData.success) {
        throw new Error(purchaseData.error || 'Failed to purchase phone number');
      }

      console.log('✅ Phone number purchased successfully');

      // Step 2: Configure AI with hot lead settings
      console.log('⚙️ Configuring AI with hot lead features...');
      
      const configResponse = await fetch('/api/customer-sms/configure-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          config: smsConfig
        })
      });

      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error(configData.error || 'Failed to configure AI');
      }

      console.log('✅ AI configured with hot lead detection');

      // Step 3: Test the system
      console.log('🧪 Testing SMS system...');
      
      const testResponse = await fetch('/api/customer-sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          testMessage: 'Hello! This is a test message to verify SMS AI setup.'
        })
      });

      const testData = await testResponse.json();
      
      if (!testData.success) {
        console.warn('⚠️ Test failed but setup may still be valid:', testData.error);
      }

      console.log('🎉 SMS AI setup complete!');
      setSetupComplete(true);

    } catch (error) {
      console.error('❌ Setup error:', error);
      setError(error.message || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const areaCode = cleaned.slice(1, 4);
      const exchange = cleaned.slice(4, 7);
      const number_suffix = cleaned.slice(7);
      return `+1 (${areaCode}) ${exchange}-${number_suffix}`;
    }
    return number;
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">
              SMS AI Setup Complete!
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Your SMS AI is Ready!</h2>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="font-medium">📱 SMS Number:</span>
                  <span className="font-mono">{formatPhoneNumber(selectedNumber)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🏢 Business:</span>
                  <span>{smsConfig.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🤖 AI Personality:</span>
                  <span className="capitalize">{smsConfig.personality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">🔥 Hot Lead Alerts:</span>
                  <span>{smsConfig.enableHotLeadAlerts ? '✅ Enabled' : '❌ Disabled'}</span>
                </div>
                {smsConfig.enableHotLeadAlerts && (
                  <div className="flex justify-between">
                    <span className="font-medium">📞 Alert Phone:</span>
                    <span className="font-mono">{smsConfig.businessOwnerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">🔥 Hot Lead Detection Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🚨 Automatic Detection</h4>
                  <p>AI analyzes every SMS for buying intent and urgency signals</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">📱 Instant Alerts</h4>
                  <p>Get SMS notifications when hot leads are detected</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">⚡ Smart Throttling</h4>
                  <p>Max 1 alert per lead per 30 minutes to prevent spam</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🕐 Business Hours</h4>
                  <p>{smsConfig.alertBusinessHours ? 'Respects business hours' : 'Alerts 24/7'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/customer-sms-dashboard'}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
              >
                Go to SMS Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Back to Main Dashboard
              </button>
            </div>

            <div className="mt-8 text-sm text-gray-600">
              <p>📝 Test your SMS AI by sending a message to: <strong>{formatPhoneNumber(selectedNumber)}</strong></p>
              <p>🔥 Try phrases like "I want to buy a house today" to test hot lead detection!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <h1 className="text-2xl font-bold">SMS AI Setup Wizard</h1>
              <span className="ml-auto text-sm text-gray-500">Step {currentStep} of 4</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Phone Number Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">📱 Choose Your SMS Number</h2>
                <p className="text-gray-600 mb-6">
                  Select a phone number for your SMS AI assistant. Customers will text this number to interact with your AI.
                </p>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading available numbers...</p>
                </div>
              ) : availableNumbers.length > 0 ? (
                <div className="grid gap-4">
                  {availableNumbers.map((number, index) => (
                    <div 
                      key={number.phoneNumber}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedNumber === number.phoneNumber 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedNumber(number.phoneNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-lg font-semibold">
                            {formatPhoneNumber(number.phoneNumber)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {number.locality}, {number.region}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ${number.price}/month
                          </div>
                          <div className="text-sm text-gray-500">
                            {number.capabilities?.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No numbers available. Please try again later.</p>
                  <button
                    onClick={loadAvailableNumbers}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: AI Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">🤖 Configure Your AI Assistant</h2>
                <p className="text-gray-600 mb-6">
                  Customize your AI assistant's personality and knowledge base.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name *</label>
                  <input
                    type="text"
                    value={smsConfig.businessName}
                    onChange={(e) => setSmsConfig({...smsConfig, businessName: e.target.value})}
                    placeholder="e.g., Acme Real Estate"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">AI Personality</label>
                  <select
                    value={smsConfig.personality}
                    onChange={(e) => setSmsConfig({...smsConfig, personality: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                <label className="block text-sm font-medium mb-2">Business Information *</label>
                <textarea
                  value={smsConfig.businessInfo}
                  onChange={(e) => setSmsConfig({...smsConfig, businessInfo: e.target.value})}
                  placeholder="Describe your business, services, and key information..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Welcome Message (Optional)</label>
                <input
                  type="text"
                  value={smsConfig.welcomeMessage}
                  onChange={(e) => setSmsConfig({...smsConfig, welcomeMessage: e.target.value})}
                  placeholder="Hi! Thanks for reaching out. How can I help you today?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* Step 3: Hot Lead Alert Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">🔥 Hot Lead Alert Settings</h2>
                <p className="text-gray-600 mb-6">
                  Configure intelligent alerts when your AI detects high-intent customers ready to buy.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">🚨 What are Hot Lead Alerts?</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  Our AI analyzes every customer message for buying intent, urgency signals, and decision-making language. 
                  When a high-value lead is detected, you get an instant SMS alert so you never miss an opportunity.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded">
                    <strong>High Intent (9-10):</strong> "I want to buy today", "My budget is $500K"
                  </div>
                  <div className="bg-white p-3 rounded">
                    <strong>Medium Intent (7-8):</strong> "Tell me about pricing", "Can we schedule a meeting?"
                  </div>
                  <div className="bg-white p-3 rounded">
                    <strong>Low Intent (1-6):</strong> "Just browsing", "What are your hours?"
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enableHotLeadAlerts"
                    checked={smsConfig.enableHotLeadAlerts}
                    onChange={(e) => setSmsConfig({...smsConfig, enableHotLeadAlerts: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="enableHotLeadAlerts" className="text-sm font-medium">
                    🔥 Enable Hot Lead Alerts (Recommended)
                  </label>
                </div>

                {smsConfig.enableHotLeadAlerts && (
                  <div className="ml-7 space-y-4 border-l-2 border-blue-200 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        📞 Business Owner Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={smsConfig.businessOwnerPhone}
                        onChange={(e) => setSmsConfig({...smsConfig, businessOwnerPhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This number will receive SMS alerts when hot leads are detected
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="alertBusinessHours"
                        checked={smsConfig.alertBusinessHours}
                        onChange={(e) => setSmsConfig({...smsConfig, alertBusinessHours: e.target.checked})}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="alertBusinessHours" className="text-sm">
                        🕐 Only send alerts during business hours (8 AM - 6 PM, Mon-Fri)
                      </label>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Alert Features:</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Instant SMS when lead score ≥ 7/10</li>
                        <li>• Smart throttling (max 1 alert per lead per 30 minutes)</li>
                        <li>• Includes lead score, message preview, and reasoning</li>
                        <li>• Configurable business hours</li>
                      </ul>
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
                <h2 className="text-xl font-semibold mb-4">🚀 Review & Launch</h2>
                <p className="text-gray-600 mb-6">
                  Review your configuration and launch your SMS AI assistant.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">📱 SMS Configuration</h3>
                    <div className="text-sm space-y-1">
                      <div><strong>Number:</strong> {formatPhoneNumber(selectedNumber)}</div>
                      <div><strong>Business:</strong> {smsConfig.businessName}</div>
                      <div><strong>Personality:</strong> {smsConfig.personality}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">🔥 Hot Lead Settings</h3>
                    <div className="text-sm space-y-1">
                      <div><strong>Alerts:</strong> {smsConfig.enableHotLeadAlerts ? '✅ Enabled' : '❌ Disabled'}</div>
                      {smsConfig.enableHotLeadAlerts && (
                        <>
                          <div><strong>Alert Phone:</strong> {smsConfig.businessOwnerPhone}</div>
                          <div><strong>Business Hours:</strong> {smsConfig.alertBusinessHours ? 'Yes' : 'No'}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">📝 Business Info</h3>
                  <p className="text-sm text-gray-600">{smsConfig.businessInfo}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">🎉 What happens next?</h3>
                <ol className="text-sm text-blue-700 space-y-2">
                  <li>1. ✅ Purchase and configure your SMS number</li>
                  <li>2. 🤖 Set up AI with your business information</li>
                  <li>3. 🔥 Enable hot lead detection system</li>
                  <li>4. 📱 Activate SMS webhook for live messages</li>
                  <li>5. 🧪 Test your SMS AI assistant</li>
                </ol>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handlePurchaseAndSetup}
                disabled={isLoading}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </span>
                ) : (
                  '🚀 Launch SMS AI'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
