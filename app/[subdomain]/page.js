'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomerSitePage() {
  const params = useParams();
  const subdomain = params.subdomain;
  
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchSiteData();
  }, [subdomain]);

  const fetchSiteData = async () => {
    try {
      const response = await fetch(`/api/sites/${subdomain}`);
      const data = await response.json();
      
      if (response.ok) {
        setSiteData(data);
        // Initialize chat with welcome message
        setMessages([{
          from: 'bot',
          text: `Hi! I'm ${data.contact.ownerName}'s AI assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load site');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      from: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Send to your existing chat API, but include business context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          businessContext: {
            businessName: siteData.branding.businessName,
            industry: siteData.business.industry,
            ownerName: siteData.contact.ownerName,
            services: siteData.content.services,
            businessDescription: siteData.content.businessDescription
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage = {
          from: 'bot',
          text: data.message,
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, botMessage]);
      } else {
        throw new Error('Chat API failed');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        from: 'bot',
        text: `Sorry, I'm having trouble right now. Please call ${siteData.contact.phone} or email ${siteData.contact.email} for immediate assistance.`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Site Not Found</h1>
          <p className="text-gray-600">The subdomain "{subdomain}" doesn't exist or hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  // Widget-only site (admin/demo page)
  if (siteData.siteType === 'widget') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold" style={{ color: siteData.branding.primaryColor }}>
                {siteData.branding.businessName} - AI Widget Demo
              </h1>
              <div className="text-sm text-gray-600">
                Widget Demo & Management
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">Your AI Widget is Ready!</h2>
            <p className="text-gray-600 mb-6">
              Copy the code below and paste it into your existing website to add the AI chatbot.
            </p>
            
            {/* Embed Code */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-6 font-mono text-sm">
              {`<script src="https://${subdomain}.yoursite.com/widget.js"></script>`}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Widget Features:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ 24/7 AI assistant</li>
                  <li>✅ Lead capture</li>
                  <li>✅ SMS notifications</li>
                  <li>✅ Appointment booking</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Contact Info:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Owner: {siteData.contact.ownerName}</div>
                  <div>Phone: {siteData.contact.phone}</div>
                  <div>Email: {siteData.contact.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold mb-4">Test Your Widget</h2>
            <p className="text-gray-600 mb-4">
              Click the chat button below to test how your AI assistant will work on your website.
            </p>
            <button
              onClick={() => setChatOpen(true)}
              className="text-white px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: siteData.branding.primaryColor }}
            >
              🤖 Test AI Assistant
            </button>
          </div>
        </main>

        {/* Chat Widget (for demo) */}
        {chatOpen && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="w-96 h-[500px] bg-white border rounded-2xl shadow-2xl">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: siteData.branding.primaryColor }}>
                <div className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm mr-2">
                    🤖
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{siteData.branding.businessName}</div>
                    <div className="text-xs opacity-90">AI Assistant</div>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-white hover:bg-white/20 rounded p-1"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div className="overflow-y-auto h-[350px] p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.from === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                    style={msg.from === 'user' ? { backgroundColor: siteData.branding.primaryColor } : {}}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    className="flex-1 border rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': siteData.branding.primaryColor }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isTyping}
                  />
                  <button
                    className="text-white px-4 py-2 rounded-full text-sm"
                    style={{ backgroundColor: siteData.branding.primaryColor }}
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full website with integrated AI
  return (
    <div className="min-h-screen bg-white" style={{ '--primary-color': siteData.branding.primaryColor }}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20 px-6 text-center"
               style={{ 
                 background: `linear-gradient(135deg, ${siteData.branding.primaryColor} 0%, ${siteData.branding.primaryColor}dd 100%)` 
               }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {siteData.content.heroText || siteData.branding.businessName}
          </h1>
          <p className="text-lg md:text-2xl mb-8">
            {siteData.content.businessDescription || `Professional ${siteData.business.industry.replace('-', ' ')} services you can trust.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setChatOpen(true)}
              className="inline-block bg-white text-gray-800 font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              💬 Chat with AI Assistant
            </button>
            {siteData.integrations.calendlyUrl && (
              <a
                href={siteData.integrations.calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-xl hover:bg-white hover:text-gray-800 transition-all duration-300"
              >
                📅 Book Appointment
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      {siteData.content.services.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: siteData.branding.primaryColor }}>
              Our Services
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {siteData.content.services.map((service, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-md text-center">
                  <div className="text-4xl mb-4">
                    {siteData.business.industry === 'real-estate' ? '🏠' : 
                     siteData.business.industry === 'plumbing' ? '🔧' :
                     siteData.business.industry === 'hvac' ? '🌡️' :
                     siteData.business.industry === 'dental' ? '🦷' :
                     siteData.business.industry === 'legal' ? '⚖️' :
                     siteData.business.industry === 'auto-repair' ? '🚗' :
                     siteData.business.industry === 'fitness' ? '💪' :
                     siteData.business.industry === 'medical' ? '🩺' : '⭐'}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{service}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 px-6 text-center" style={{ backgroundColor: siteData.branding.primaryColor }}>
        <div className="max-w-4xl mx-auto text-white">
          <h2 className="text-3xl font-bold mb-8">Get In Touch</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-2">📞 Call</h3>
              <p>{siteData.contact.phone}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📧 Email</h3>
              <p>{siteData.contact.email}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">👤 Contact</h3>
              <p>{siteData.contact.ownerName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="w-16 h-16 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          style={{ backgroundColor: siteData.branding.primaryColor }}
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Open AI chat"
        >
          {chatOpen ? "✕" : "🤖"}
        </button>
        
        {/* Full Chat Interface */}
        {chatOpen && (
          <div className="w-96 h-[600px] bg-white border rounded-2xl shadow-2xl p-4 mt-4">
            {/* Chat Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2"
                     style={{ backgroundColor: siteData.branding.primaryColor }}>
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-sm">{siteData.contact.ownerName}'s AI Assistant</div>
                  <div className="text-xs text-green-500">● Online</div>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="overflow-y-auto h-[450px] pb-2 mb-2 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                    msg.from === "user" 
                      ? "text-white rounded-br-sm" 
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                  style={msg.from === "user" ? { backgroundColor: siteData.branding.primaryColor } : {}}
                  >
                    <div className="text-sm">{msg.text}</div>
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
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': siteData.branding.primaryColor }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about our services..."
                disabled={isTyping}
              />
              <button
                className="text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50 transition-colors duration-200"
                style={{ backgroundColor: siteData.branding.primaryColor }}
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
