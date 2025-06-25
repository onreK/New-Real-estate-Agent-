'use client';

import { useState, useEffect, useRef } from 'react';

export default function DemoPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [conversationId] = useState(`demo_${Date.now()}`);
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
    setHotLeadAlert(null); // Clear previous alert

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          conversationId: conversationId,
          configId: 'default',
          testMode: false // Enable hot lead detection
        })
      });

      const data = await response.json();

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isAI: true,
        timestamp: new Date().toISOString(),
        hotLeadAnalysis: data.hotLeadAnalysis,
        alertSent: data.alertSent
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show hot lead alert if detected
      if (data.hotLeadAnalysis?.isHotLead) {
        setHotLeadAlert({
          score: data.hotLeadAnalysis.score,
          reasoning: data.hotLeadAnalysis.reasoning,
          urgency: data.hotLeadAnalysis.urgency,
          alertSent: data.alertSent
        });

        // Auto-hide alert after 10 seconds
        setTimeout(() => setHotLeadAlert(null), 10000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm having some technical difficulties. Please try again in a moment.",
        isAI: true,
        isError: true,
        timestamp: new Date().toISOString()
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

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ OpenAI Connected Successfully!';
      case 'error': return '❌ Connection Error - Check API Key';
      default: return '🔄 Checking Connection...';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'text-red-600 bg-red-100 border-red-300';
    if (score >= 7) return 'text-orange-600 bg-orange-100 border-orange-300';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-green-600 bg-green-100 border-green-300';
  };

  const getScoreEmoji = (score) => {
    if (score >= 9) return '🚨';
    if (score >= 7) return '🔥';
    if (score >= 5) return '⚡';
    return '📝';
  };

  // Hot lead testing phrases
  const hotLeadPhrases = [
    { 
      text: "I want to buy a house today", 
      category: "High Intent (9-10)", 
      description: "Immediate buying intent with urgency" 
    },
    { 
      text: "My budget is $500K, what's available?", 
      category: "High Intent (8-9)", 
      description: "Budget mention with specific inquiry" 
    },
    { 
      text: "Can you call me? I need to buy ASAP", 
      category: "High Intent (9-10)", 
      description: "Contact request with urgency" 
    },
    { 
      text: "I'm interested in pricing for your services", 
      category: "Medium Intent (6-7)", 
      description: "Interest in pricing information" 
    },
    { 
      text: "Tell me more about what you offer", 
      category: "Medium Intent (5-6)", 
      description: "General interest and information seeking" 
    },
    { 
      text: "What are your business hours?", 
      category: "Low Intent (2-3)", 
      description: "Basic informational query" 
    },
    { 
      text: "Just browsing your website", 
      category: "Low Intent (1-2)", 
      description: "Low engagement, browsing only" 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Chatbot Demo</h1>
          <p className="text-gray-600">Test your AI customer engagement platform</p>
          
          {/* Connection Status */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 mr-4"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/ai-config'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Configure AI
              </button>
            </div>
          </div>
          
          <div className={`mt-4 font-medium ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Your AI Assistant Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🤖</div>
                <h2 className="text-xl font-semibold">Your AI Assistant in Action</h2>
              </div>
              
              <p className="text-gray-600 mb-4">
                This is how your AI chatbot will appear on your customers' websites.
                The AI assistant is trained on your business information and can:
              </p>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Answer questions about your business and services
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Qualify potential customers and capture leads
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Schedule appointments and consultations
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Provide 24/7 customer support
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Integrate with your existing CRM and tools
                </li>
                <li className="flex items-center">
                  <span className="text-red-500 mr-2">🔥</span>
                  <strong>Detect hot leads automatically</strong>
                </li>
              </ul>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center text-sm">
                  <span className="text-blue-600 mr-2">🤖</span>
                  <span><strong>Powered by real OpenAI GPT-4 (configurable)</strong></span>
                </div>
              </div>
            </div>

            {/* Hot Lead Testing Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🔥</div>
                <h2 className="text-xl font-semibold">Hot Lead Detection Testing</h2>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
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

            {/* Sample Conversations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">💡 Try These Sample Conversations:</h3>
              
              <div className="space-y-4 text-sm">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Customer Service:</h4>
                  <p className="text-blue-700">"What services do you offer?"</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Lead Generation:</h4>
                  <p className="text-green-700">"I'm interested in getting a quote"</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Appointment Booking:</h4>
                  <p className="text-purple-700">"Can I schedule a consultation?"</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">🔥 Hot Lead (High Intent):</h4>
                  <p className="text-red-700">"I want to buy a house today"</p>
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
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-sm mt-2">
                    <strong>AI Analysis:</strong> {hotLeadAlert.reasoning}
                  </div>
                  <div className="text-sm mt-1">
                    <strong>Urgency:</strong> {hotLeadAlert.urgency}
                  </div>
                  {hotLeadAlert.alertSent && (
                    <div className="text-sm mt-1 text-green-600">
                      ✅ Business owner alert sent via SMS
                    </div>
                  )}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            : 'bg-gray-100 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Hot Lead Score Indicator */}
                      {message.hotLeadAnalysis && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(message.hotLeadAnalysis.score)}`}>
                              {getScoreEmoji(message.hotLeadAnalysis.score)} Lead Score: {message.hotLeadAnalysis.score}/10
                            </span>
                            {message.hotLeadAnalysis.isHotLead && (
                              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                                🔥 HOT LEAD
                              </span>
                            )}
                          </div>
                          {message.alertSent && (
                            <div className="text-xs text-green-600 mt-1">
                              📱 Business owner notified
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
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
                    Send
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
