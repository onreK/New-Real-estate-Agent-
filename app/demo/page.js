'use client';

import { useState, useEffect, useRef } from 'react';

export default function DemoPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // ✅ REMOVED: connectionStatus state - no longer needed
  const [conversationKey] = useState(`conv_${Date.now()}`);
  const [hotLeadAlert, setHotLeadAlert] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // ✅ REMOVED: checkConnection() - no longer needed since chat works
    // Add welcome message
    setMessages([{
      id: 'welcome',
      content: "Hi! I'm the AI assistant for Test Real Estate Co. How can I help you with your real estate needs today?",
      isAI: true,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // ✅ REMOVED: checkConnection function - no longer needed

  const sendMessage = async (messageText = null) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: messageToSend,
      isAI: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setHotLeadAlert(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: messageToSend
            }
          ],
          conversationKey: conversationKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.response || 'AI response error');
      }

      const aiMessage = {
        id: `ai_${Date.now()}`,
        content: data.response,
        isAI: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle hot lead detection
      if (data.isHotLead) {
        setHotLeadAlert({
          message: "🔥 Hot lead detected! This customer seems ready to take action.",
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        content: "I'm sorry, I'm having some technical difficulties. Please try again in a moment or contact us directly for immediate assistance.",
        isAI: true,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What's the average cost of a home in Virginia?",
    "What services do you provide?",
    "I'm ready to buy a house today",
    "Can you help me find a luxury property?"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Test your AI customer engagement platform
          </h1>
          <div className="flex gap-3">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </a>
            <a
              href="/ai-config"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Configure AI
            </a>
          </div>
        </div>
      </div>

      {/* ✅ REMOVED: Connection status alert - no longer shown */}

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🤖</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Your AI Assistant in Action</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                This is how your AI chatbot will appear on your customers' websites. The AI assistant is 
                trained on your business information and can:
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Answer questions about your business and services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Qualify potential customers and capture leads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Schedule appointments and consultations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Provide 24/7 customer support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Integrate with your existing CRM and tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">🔥</span>
                  <span className="text-gray-700">Detect hot leads automatically</span>
                </li>
              </ul>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600">🤖</span>
                  <span className="font-medium text-blue-800">Powered by real OpenAI GPT-4</span>
                </div>
                <p className="text-blue-700 text-sm">
                  (configurable)
                </p>
              </div>
            </div>

            {/* Hot Lead Detection Testing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔥</span>
                <h3 className="text-lg font-semibold text-gray-900">Hot Lead Detection Testing</h3>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
                Try these messages to test hot lead detection:
              </p>
              
              <div className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    disabled={isLoading}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">☁️</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Test Real Estate Co</h3>
                      <p className="text-blue-100 text-sm">AI Assistant</p>
                    </div>
                  </div>
                  <span className="bg-blue-500 text-xs px-2 py-1 rounded">Live Demo - Try It Now!</span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.isAI
                          ? message.isError 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isAI ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Hot Lead Alert */}
                {hotLeadAlert && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">🔥</span>
                      <span className="text-orange-800 font-medium">Hot Lead Detected!</span>
                    </div>
                    <p className="text-orange-700 text-sm mt-1">{hotLeadAlert.message}</p>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
                <p className="text-center text-gray-500 text-xs mt-2">
                  Powered by AI Customer Engagement Platform
                </p>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-6 text-center text-gray-600">
              <p className="text-sm">
                This is how your customers will interact with your AI assistant
              </p>
              <a
                href="/ai-config"
                className="inline-block mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ready to configure AI assistant?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
