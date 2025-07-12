'use client';

import { useState, useEffect, useRef } from 'react';

export default function DemoPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
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
    checkConnection();
    // Add welcome message
    setMessages([{
      id: 'welcome',
      content: "Hi! I'm the AI assistant for Test Real Estate Co. How can I help you with your real estate needs today?",
      isAI: true,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/chat?action=test-connection');
      const data = await response.json();
      setConnectionStatus(data.connected ? 'connected' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

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
      console.log('🚀 Sending message:', messageToSend);
      
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
      console.log('📨 Chat response:', data);

      // ✅ FIXED: Handle both possible response formats
      const aiResponseText = data.response || data.message || 'Sorry, I encountered an error. Please try again.';

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        isAI: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check for hot lead detection
      if (data.isHotLead || data.hotLead) {
        console.log('🔥 Hot lead detected!');
        setHotLeadAlert({
          score: 10,
          message: messageToSend,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I'm having trouble connecting right now. Please try again or contact us directly for assistance.`,
        isAI: true,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'bg-red-50 border-red-500';
    if (score >= 6) return 'bg-orange-50 border-orange-500';
    return 'bg-yellow-50 border-yellow-500';
  };

  const getScoreEmoji = (score) => {
    if (score >= 8) return '🔥';
    if (score >= 6) return '⚡';
    return '💡';
  };

  // Sample hot lead phrases for testing
  const hotLeadPhrases = [
    {
      text: "I want to buy a house today",
      category: "High Intent (9-10)",
      description: "Immediate buying intent with urgency"
    },
    {
      text: "What's my budget for a $500k home?",
      category: "High Intent (8-9)",
      description: "Specific budget discussion"
    },
    {
      text: "Can I schedule a showing this week?",
      category: "Medium Intent (6-7)",
      description: "Ready to take action"
    },
    {
      text: "Tell me about properties in downtown",
      category: "Low Intent (3-4)",
      description: "General information seeking"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Test your AI customer engagement platform
              </h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/ai-config'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Configure AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className={`flex items-center space-x-2 p-3 rounded-lg ${
          connectionStatus === 'connected' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={connectionStatus === 'connected' ? 'text-green-700' : 'text-red-700'}>
            {connectionStatus === 'connected' 
              ? '✅ OpenAI Connected Successfully!' 
              : '❌ Connection Error - Check API Key'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Assistant Info & Test Phrases */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Assistant Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🤖</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Your AI Assistant in Action</h2>
              </div>
              
              <p className="text-gray-600 mb-4">
                This is how your AI chatbot will appear on your customers' websites. The AI assistant is trained on your business information and can:
              </p>
              
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Answer questions about your business and services</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Qualify potential customers and capture leads</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Schedule appointments and consultations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Provide 24/7 customer support</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Integrate with your existing CRM and tools</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-0.5">🔥</span>
                  <span className="font-medium">Detect hot leads automatically</span>
                </li>
              </ul>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">🤖</span>
                  <span className="text-sm font-medium text-blue-900">Powered by real OpenAI GPT-4</span>
                </div>
                <span className="text-xs text-blue-700">(configurable)</span>
              </div>
            </div>

            {/* Hot Lead Testing */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🔥</span>
                <h3 className="text-lg font-semibold text-gray-900">Hot Lead Detection Testing</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Click these sample phrases to test the AI's hot lead detection system:
              </p>
              
              <div className="space-y-3">
                {hotLeadPhrases.map((phrase, index) => (
                  <div key={index}>
                    <button
                      onClick={() => sendMessage(phrase.text)}
                      disabled={isLoading}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-sm text-gray-900">
                        "{phrase.text}"
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {phrase.category}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {phrase.description}
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>💡 Pro Tip:</strong> High-intent phrases (score 7+) trigger instant alerts to business owners via SMS!
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg h-[700px] flex flex-col">
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center">
                <div className="text-xl mr-3">💬</div>
                <div>
                  <h3 className="font-semibold">Test Real Estate Co</h3>
                  <p className="text-blue-100 text-sm">AI Assistant</p>
                </div>
                <div className="ml-auto">
                  <div className="text-xs text-blue-100">Live Demo - Try It Now!</div>
                </div>
              </div>

              {/* Hot Lead Alert */}
              {hotLeadAlert && (
                <div className={`p-4 border-l-4 ${getScoreColor(hotLeadAlert.score)} border animate-pulse`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getScoreEmoji(hotLeadAlert.score)}</span>
                      <span className="font-semibold">
                        HOT LEAD DETECTED! Score: {hotLeadAlert.score}/10
                      </span>
                    </div>
                    <button
                      onClick={() => setHotLeadAlert(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>AI Analysis:</strong> Customer shows high buying intent with urgency keywords</p>
                    <p><strong>Urgency:</strong> High</p>
                    <p className="flex items-center mt-1">
                      <span className="text-green-600 mr-1">✅</span>
                      <span>Business owner alert sent via SMS</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isAI
                          ? message.isError
                            ? 'bg-red-100 text-red-800'
                            : 'bg-white text-gray-800 shadow-sm'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isAI ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <div className="flex space-x-1">
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
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '...' : 'Send'}
                  </button>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500">
                    Powered by AI Customer Engagement Platform
                  </p>
                </div>
              </div>

              {/* Demo Footer */}
              <div className="text-center py-4 bg-gray-50 rounded-b-lg">
                <p className="text-sm text-gray-600 mb-2">
                  This is how your customers will interact with your AI assistant
                </p>
                <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-block">
                  <div className="font-semibold">Ready to deploy your AI assistant?</div>
                  <div className="text-sm text-blue-100">Get your embed code and start capturing leads today!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
