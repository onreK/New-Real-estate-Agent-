// app/demo/page.js
'use client';

import ChatWidget from '../components/ChatWidget';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Chatbot Demo</h1>
              <p className="text-gray-600">Test your AI customer engagement platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Back to Dashboard
              </a>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Configure AI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demo Description */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🤖 Your AI Assistant in Action
              </h2>
              <div className="space-y-4">
                <p className="text-gray-600">
                  This is how your AI chatbot will appear on your customers' websites. The AI assistant is trained on your business information and can:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Answer questions about your business and services
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Qualify potential customers and capture leads
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Schedule appointments and consultations
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Provide 24/7 customer support
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Integrate with your existing CRM and tools
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Try These Sample Conversations:
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium">Customer Service:</p>
                  <p className="text-blue-700 text-sm">"What services do you offer?"</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">Lead Generation:</p>
                  <p className="text-green-700 text-sm">"I'm interested in getting a quote"</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-purple-800 text-sm font-medium">Appointment Booking:</p>
                  <p className="text-purple-700 text-sm">"Can I schedule a consultation?"</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 text-sm font-medium">Information:</p>
                  <p className="text-orange-700 text-sm">"What are your business hours?"</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚀 Next Steps:
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">1. Configure AI Personality</div>
                  <div className="text-sm text-gray-600">Customize tone, responses, and business knowledge</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">2. Train with Your Content</div>
                  <div className="text-sm text-gray-600">Upload FAQs, documents, and product information</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">3. Get Embed Code</div>
                  <div className="text-sm text-gray-600">Add the chatbot to your website with one line of code</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">4. Monitor & Optimize</div>
                  <div className="text-sm text-gray-600">Track conversations and improve AI responses</div>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Widget Demo */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                💬 Live Demo - Try It Now!
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <ChatWidget 
                  businessId="business_test_1"
                  businessName="Test Real Estate Co"
                  isDemo={true}
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">
                This is how your customers will interact with your AI assistant
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">
                Ready to deploy your AI assistant?
              </h3>
              <p className="text-blue-100 mb-4">
                Get your embed code and start capturing leads today!
              </p>
              <div className="flex space-x-3">
                <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  Get Embed Code
                </button>
                <button className="border border-blue-300 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Configure AI
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Real-Time Analytics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">24</div>
                  <div className="text-sm text-gray-600">Conversations Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">8</div>
                  <div className="text-sm text-gray-600">Leads Captured</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">67%</div>
                  <div className="text-sm text-gray-600">Response Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">4.8</div>
                  <div className="text-sm text-gray-600">Satisfaction Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget (like on a real website) */}
      <ChatWidget 
        businessId="business_test_1"
        businessName="Test Real Estate Co"
        isDemo={false}
      />
    </div>
  );
}
