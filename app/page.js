'use client';

import React, { useState } from "react";

// Enhanced Google Sheets logging with lead scoring
const logToSheets = async (message, leadData = {}, sessionId) => {
  const timestamp = new Date().toISOString();
  
  // Simple lead scoring based on keywords
  const getLeadScore = (message, leadData) => {
    const hotKeywords = ['buy', 'sell', 'ready', 'looking', 'serious', 'budget', 'timeline'];
    const warmKeywords = ['interested', 'thinking', 'considering', 'maybe', 'possible'];
    
    const messageText = message.toLowerCase();
    const hotMatches = hotKeywords.filter(keyword => messageText.includes(keyword)).length;
    const warmMatches = warmKeywords.filter(keyword => messageText.includes(keyword)).length;
    
    if (hotMatches >= 2) return 'HOT';
    if (hotMatches >= 1 || warmMatches >= 2) return 'WARM';
    return 'COLD';
  };

  const leadScore = getLeadScore(message, leadData);
  
  const params = new URLSearchParams({
    timestamp,
    message: message.trim(),
    leadScore,
    sessionId,
    name: leadData.name || '',
    email: leadData.email || '',
    phone: leadData.phone || '',
    propertyType: leadData.propertyType || '',
    timeline: leadData.timeline || '',
    budget: leadData.budget || ''
  });
  
  // Your Google Apps Script URL
  const url = `https://script.google.com/macros/s/AKfycbwk-n0IMHKWQw4-WW1HmLQe38-QJuDROcmgB_ZiTm_mOh7HBI4ssIgjQ1tIdHGv_8Y0/exec?${params}`;
  
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors'
    });
    console.log('Lead logged to Google Sheets successfully');
    return leadScore;
  } catch (error) {
    console.error("Google Sheet logging failed:", error);
    return leadScore;
  }
};

// Session ID generator with fallback
const getSessionId = () => {
  try {
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
  } catch (error) {
    return 'temp_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
};

// Lead data extractor from conversation
const extractLeadData = (messages) => {
  const conversation = messages.map(m => m.text).join(' ').toLowerCase();
  
  const leadData = {};
  
  // Extract email
  const emailMatch = conversation.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) leadData.email = emailMatch[0];
  
  // Extract phone
  const phoneMatch = conversation.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
  if (phoneMatch) leadData.phone = phoneMatch[0];
  
  // Extract budget
  if (conversation.includes('budget') || conversation.includes('price') || conversation.includes('$')) {
    const budgetMatch = conversation.match(/\$[\d,]+/);
    if (budgetMatch) leadData.budget = budgetMatch[0];
  }
  
  return leadData;
};

// Enhanced AI response with lead data
const generateAIResponse = async (messages, leadData) => {
  try {
    console.log('Calling /api/chat with messages and lead data');
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, leadInfo: leadData }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('AI response failed:', error);
    return "Thanks for your message! Amanda will get back to you soon. In the meantime, feel free to schedule a consultation using the calendar above.";
  }
};

export default function RealEstateAgent() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      from: "bot", 
      text: "Hi! I'm Amanda's AI assistant. I can help you with real estate questions, schedule appointments, and connect you with Amanda. Are you looking to buy or sell a property in the Richmond & Chester area?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leadData, setLeadData] = useState({});

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const sessionId = getSessionId();
    const userMessage = {
      from: "user",
      text: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Extract and update lead data
    const extractedData = extractLeadData(newMessages);
    const updatedLeadData = { ...leadData, ...extractedData };
    setLeadData(updatedLeadData);

    // Log user message with lead scoring
    const leadScore = await logToSheets(userMessage.text, updatedLeadData, sessionId);

    // Generate AI response with lead context
    const aiResponse = await generateAIResponse(newMessages, updatedLeadData);
    
    const botMessage = {
      from: "bot",
      text: aiResponse,
      timestamp: new Date().toISOString()
    };

    setMessages([...newMessages, botMessage]);
    setIsTyping(false);

    // Log bot response
    await logToSheets(`BOT_RESPONSE: ${aiResponse}`, updatedLeadData, sessionId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Amanda the Realtor</h1>
          <p className="text-lg md:text-2xl mb-8">Your Trusted Real Estate Expert in Richmond & Chester, Virginia</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#schedule"
              className="inline-block bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              📅 Book Free Consultation
            </a>
            <button
              onClick={() => setChatOpen(true)}
              className="inline-block bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-xl hover:bg-white hover:text-blue-700 transition-all duration-300"
            >
              💬 Chat with AI Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Amanda?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold mb-2">Local Market Expert</h3>
              <p className="text-gray-600">Deep knowledge of Richmond & Chester real estate markets with 10+ years experience</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Service</h3>
              <p className="text-gray-600">24/7 intelligent assistant to answer questions and schedule appointments instantly</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-5xl mb-4">💯</div>
              <h3 className="text-xl font-semibold mb-2">Proven Results</h3>
              <p className="text-gray-600">200+ happy families helped with buying and selling their dream homes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-600">🏡 Home Buying</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>• First-time buyer guidance</li>
                <li>• Market analysis & property search</li>
                <li>• Negotiation & closing support</li>
                <li>• Mortgage and financing assistance</li>
              </ul>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-purple-600">🏷️ Home Selling</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>• Free home valuation</li>
                <li>• Professional staging advice</li>
                <li>• Marketing & listing strategy</li>
                <li>• Fast, profitable sales process</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule" className="py-16 px-6 text-center bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Schedule Your FREE Consultation</h2>
          <p className="text-lg text-gray-600 mb-8">Ready to buy or sell? Book a personalized consultation with Amanda today!</p>
          <div className="max-w-2xl mx-auto">
            <iframe
              src="https://calendly.com/kernopay/home-buyer-consultation"
              width="100%"
              height="700"
              frameBorder="0"
              className="rounded-xl shadow-lg"
              title="Schedule with Amanda"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Get In Touch</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-2">📞 Call</h3>
              <p>(804) 555-AMANDA</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📧 Email</h3>
              <p>amanda@richmondrealty.com</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📍 Service Areas</h3>
              <p>Richmond & Chester, VA</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Open AI chat"
        >
          {chatOpen ? "✕" : "🤖"}
        </button>
        
        {chatOpen && (
          <div className="w-80 h-96 bg-white border rounded-2xl shadow-2xl p-4 mt-4">
            {/* Chat Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-sm">Amanda's AI Assistant</div>
                  <div className="text-xs text-green-500">● Online 24/7</div>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="overflow-y-auto h-64 pb-2 mb-2 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                    msg.from === "user" 
                      ? "bg-blue-600 text-white rounded-br-sm" 
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <div className="text-sm">{msg.text}</div>
                    <div className={`text-xs mt-1 ${msg.from === "user" ? "text-blue-200" : "text-gray-500"}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex space-x-2">
              <input
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about buying, selling, or schedule..."
                disabled={isTyping}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
