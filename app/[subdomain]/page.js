'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomerSitePage() {
  const params = useParams();
  const subdomain = params.subdomain;
  
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Enhanced Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [leadData, setLeadData] = useState({});
  const [showBookingWidget, setShowBookingWidget] = useState(false);
  const [bookingLink, setBookingLink] = useState(null);

  useEffect(() => {
    fetchSiteData();
  }, [subdomain]);

  // Auto-open chat after 3 seconds
  useEffect(() => {
    if (siteData) {
      const timer = setTimeout(() => {
        setChatOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [siteData]);

  const fetchSiteData = async () => {
    try {
      const response = await fetch(`/api/sites/${subdomain}`);
      const data = await response.json();
      
      if (response.ok) {
        setSiteData(data);
        // Initialize chat with enhanced welcome message
        setMessages([{
          from: 'bot',
          text: `Hi! I'm ${data.contact.ownerName}'s AI assistant with enhanced lead tracking and real-time alerts. I can help you with ${data.business.industry.replace('-', ' ')} questions and schedule appointments with ${data.contact.ownerName}. How can I help you today?`,
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

  // Session ID generator
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

  // Enhanced lead data extractor
  const extractLeadData = (messages) => {
    const conversation = messages.map(m => m.text).join(' ').toLowerCase();
    const leadData = {};
    
    // Extract email
    const emailMatch = conversation.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) leadData.email = emailMatch[0];
    
    // Extract phone (multiple formats)
    const phoneMatch = conversation.match(/\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) leadData.phone = phoneMatch[0];
    
    // Extract name (look for "my name is" or "I'm")
    const nameMatch = conversation.match(/(?:my name is|i'm|i am|this is)\s+([a-zA-Z\s]+)/i);
    if (nameMatch) leadData.name = nameMatch[1].trim();
    
    // Extract budget (multiple formats)
    const budgetMatch = conversation.match(/\$[\d,]+(?:k|,000)?|\b\d+k\b|budget.*?\$?[\d,]+/i);
    if (budgetMatch) leadData.budget = budgetMatch[0];
    
    // Extract property type (for real estate)
    if (siteData?.business.industry === 'real-estate') {
      if (conversation.includes('condo') || conversation.includes('townhouse') || conversation.includes('apartment')) {
        leadData.propertyType = 'Condo/Townhouse';
      } else if (conversation.includes('house') || conversation.includes('home')) {
        leadData.propertyType = 'Single Family';
      }
    }
    
    // Extract timeline urgency
    if (conversation.match(/urgent|asap|immediately|this week/)) {
      leadData.timeline = 'Immediate';
    } else if (conversation.match(/soon|next month|quickly/)) {
      leadData.timeline = 'Short Term';
    } else if (conversation.match(/planning|future|eventually/)) {
      leadData.timeline = 'Long Term';
    }
    
    return leadData;
  };

  // Enhanced lead scoring with business context
  const getLeadScore = (message, leadData) => {
    const messageText = message.toLowerCase();
    let score = 0;
    
    // Industry-specific keywords
    const getIndustryKeywords = (industry) => {
      switch(industry) {
        case 'real-estate':
          return {
            hot: ['buy', 'sell', 'ready', 'looking', 'serious', 'budget', 'timeline', 'mortgage', 'preapproved', 'cash', 'closing', 'offer', 'contract'],
            warm: ['interested', 'thinking', 'considering', 'maybe', 'possible', 'exploring', 'researching', 'planning'],
            cold: ['just browsing', 'just looking', 'no rush', 'far future', 'years from now']
          };
        case 'dental':
          return {
            hot: ['pain', 'emergency', 'urgent', 'appointment', 'insurance', 'cleaning', 'checkup', 'procedure'],
            warm: ['interested', 'thinking', 'consultation', 'estimate', 'quote'],
            cold: ['general info', 'just curious', 'maybe later']
          };
        case 'legal':
          return {
            hot: ['lawsuit', 'court', 'urgent', 'legal issue', 'need lawyer', 'case', 'consultation'],
            warm: ['considering', 'advice', 'question', 'possible case'],
            cold: ['general info', 'hypothetical', 'research']
          };
        default:
          return {
            hot: ['urgent', 'need', 'ready', 'serious', 'budget', 'timeline', 'appointment', 'service'],
            warm: ['interested', 'considering', 'quote', 'estimate', 'consultation'],
            cold: ['just looking', 'general info', 'maybe later']
          };
      }
    };

    const keywords = getIndustryKeywords(siteData?.business.industry || 'other');
    
    // Count keyword matches
    const hotMatches = keywords.hot.filter(keyword => messageText.includes(keyword)).length;
    const warmMatches = keywords.warm.filter(keyword => messageText.includes(keyword)).length;
    const coldMatches = keywords.cold.filter(keyword => messageText.includes(keyword)).length;
    
    // Base scoring
    score += hotMatches * 3;
    score += warmMatches * 1;
    score -= coldMatches * 2;
    
    // Bonus points for contact info
    if (leadData.phone) score += 2;
    if (leadData.email) score += 2;
    if (leadData.name) score += 1;
    if (leadData.budget) score += 3;
    
    // Time urgency bonuses
    if (messageText.match(/today|tomorrow|this week|urgent|asap/)) score += 4;
    if (messageText.match(/next month|soon|quickly/)) score += 2;
    
    // Determine final score
    if (score >= 8) return 'HOT';
    if (score >= 4) return 'WARM';
    if (score >= 1) return 'LUKEWARM';
    return 'COLD';
  };

  // Log conversation to SaaS database
  const logConversation = async (message, leadData, sessionId, isBot = false) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain,
          sessionId: sessionId,
          message: message,
          isBot: isBot,
          leadData: leadData,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to log conversation to database');
      }
    } catch (error) {
      console.warn('Error logging conversation:', error);
    }
  };

  // Enhanced Google Sheets logging (if configured)
  const logToGoogleSheets = async (message, leadData, sessionId) => {
    // Only attempt if Google Sheets is configured for this business
    if (!siteData?.integrations?.googleSheetUrl) {
      return null; // Gracefully skip if not configured
    }

    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain,
          message: message,
          leadData: leadData,
          sessionId: sessionId,
          googleSheetUrl: siteData.integrations.googleSheetUrl
        })
      });

      if (response.ok) {
        console.log('Logged to Google Sheets successfully');
      }
    } catch (error) {
      console.warn('Google Sheets logging failed (but continuing):', error);
    }
  };

  // Enhanced SMS notification (if configured)
  const sendSMSNotification = async (type, leadData, message = '') => {
    // Only attempt if SMS is configured for this business
    if (!siteData?.contact?.phone) {
      return null; // Gracefully skip if not configured
    }

    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          businessData: {
            subdomain: subdomain,
            businessName: siteData.branding.businessName,
            ownerName: siteData.contact.ownerName,
            ownerPhone: siteData.contact.phone
          },
          leadData: leadData,
          message: message
        })
      });

      if (response.ok) {
        console.log('SMS notification sent successfully');
      }
    } catch (error) {
      console.warn('SMS notification failed (but continuing):', error);
    }
  };

  // Enhanced AI response with business context
  const generateAIResponse = async (messages, leadData) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          businessContext: {
            businessName: siteData.branding.businessName,
            industry: siteData.business.industry,
            ownerName: siteData.contact.ownerName,
            services: siteData.content.services,
            businessDescription: siteData.content.businessDescription,
            phone: siteData.contact.phone,
            email: siteData.contact.email
          },
          leadInfo: leadData,
          integrations: {
            hasCalendly: !!siteData.integrations?.calendlyUrl,
            calendlyUrl: siteData.integrations?.calendlyUrl
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('AI response failed:', error);
      return `Thanks for your message! ${siteData.contact.ownerName} will get back to you soon. In the meantime, feel free to call ${siteData.contact.phone} or email ${siteData.contact.email}.`;
    }
  };

  // Real booking function (if Calendly is configured)
  const checkAvailabilityAndBook = async (leadData) => {
    if (!siteData?.integrations?.calendlyUrl || !leadData.name || !leadData.email) {
      return { success: false, error: 'Missing requirements for booking' };
    }

    try {
      const response = await fetch('/api/calendly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBookingLink',
          calendlyUrl: siteData.integrations.calendlyUrl,
          email: leadData.email,
          name: leadData.name,
          businessName: siteData.branding.businessName
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Booking check failed:', error);
      return { success: false, error: 'Booking system unavailable' };
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const sessionId = getSessionId();
    const userMessage = {
      from: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Extract and update lead data
    const extractedData = extractLeadData(newMessages);
    const updatedLeadData = { ...leadData, ...extractedData };
    setLeadData(updatedLeadData);

    // Get lead score
    const leadScore = getLeadScore(userMessage.text, updatedLeadData);
    updatedLeadData.leadScore = leadScore;

    // Log conversation to SaaS database (always)
    await logConversation(userMessage.text, updatedLeadData, sessionId, false);

    // Log to Google Sheets (if configured)
    await logToGoogleSheets(userMessage.text, updatedLeadData, sessionId);

    // Send SMS notification (if configured and qualified lead)
    if (updatedLeadData.name || updatedLeadData.email || updatedLeadData.phone) {
      await sendSMSNotification('new_lead', updatedLeadData, userMessage.text);
      
      // Special alert for hot leads
      if (leadScore === 'HOT') {
        await sendSMSNotification('hot_lead_alert', updatedLeadData, userMessage.text);
      }
    }

    // Generate AI response with full business context
    const aiResponse = await generateAIResponse(newMessages, updatedLeadData);
    
    const botMessage = {
      from: 'bot',
      text: aiResponse,
      timestamp: new Date().toISOString()
    };

    setMessages([...newMessages, botMessage]);
    setIsTyping(false);

    // Log bot response to database
    await logConversation(aiResponse, updatedLeadData, sessionId, true);

    // Check if AI wants to book appointment
    const wantsToBook = (
      aiResponse.toLowerCase().includes('book') || 
      aiResponse.toLowerCase().includes('schedule') ||
      aiResponse.toLowerCase().includes('appointment') ||
      userMessage.text.toLowerCase().includes('appointment') ||
      userMessage.text.toLowerCase().includes('book') ||
      userMessage.text.toLowerCase().includes('schedule')
    );

    // If they want to book and we have required info
    if (wantsToBook && updatedLeadData.name && updatedLeadData.email) {
      setTimeout(async () => {
        const bookingResult = await checkAvailabilityAndBook(updatedLeadData);
        
        if (bookingResult.success && bookingResult.bookingUrl) {
          // Real booking link created!
          setBookingLink(bookingResult.bookingUrl);
          const bookingSuccessMessage = {
            from: 'bot',
            text: `🎉 Perfect! I've created a personalized booking link for you, ${updatedLeadData.name}. Click below to select your preferred time!`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, bookingSuccessMessage]);
          
          await sendSMSNotification('appointment_booked', updatedLeadData);
          
        } else if (siteData.integrations?.calendlyUrl) {
          // Fallback to embedded widget
          setShowBookingWidget(true);
          const fallbackMessage = {
            from: 'bot',
            text: `I've opened ${siteData.contact.ownerName}'s calendar for you. Please select your preferred time!`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, fallbackMessage]);
        } else {
          // No Calendly configured - graceful fallback
          const noCalendlyMessage = {
            from: 'bot',
            text: `I'll have ${siteData.contact.ownerName} contact you directly to schedule. You can also call ${siteData.contact.phone} for immediate scheduling.`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, noCalendlyMessage]);
        }
      }, 1500);
    }
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

  // Get lead score color for UI
  const getLeadScoreColor = (score) => {
    switch(score) {
      case 'HOT': return 'text-red-600 bg-red-100';
      case 'WARM': return 'text-orange-600 bg-orange-100';
      case 'LUKEWARM': return 'text-yellow-600 bg-yellow-100';
      case 'COLD': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
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
                Enhanced AI Widget with Lead Scoring
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">Your Enhanced AI Widget is Ready!</h2>
            <p className="text-gray-600 mb-6">
              Copy the code below and paste it into your existing website to add the AI chatbot with advanced lead tracking.
            </p>
            
            {/* Embed Code */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-6 font-mono text-sm overflow-x-auto">
              <div className="whitespace-nowrap">
                {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://yoursite.com'}/api/widget/${subdomain}/widget.js"></script>`}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-800 mb-2">🚀 Enhanced Features</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Advanced lead scoring (HOT/WARM/COLD)</li>
                <li>✅ Real-time SMS notifications</li>
                <li>✅ Google Sheets integration</li>
                <li>✅ Calendly appointment booking</li>
                <li>✅ Full conversation tracking</li>
                <li>✅ Dashboard analytics</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Widget Features:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ 24/7 AI assistant</li>
                  <li>✅ Enhanced lead capture</li>
                  <li>✅ SMS notifications</li>
                  <li>✅ Real appointment booking</li>
                  <li>✅ Lead scoring & analytics</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Business Info:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Owner: {siteData.contact.ownerName}</div>
                  <div>Phone: {siteData.contact.phone}</div>
                  <div>Email: {siteData.contact.email}</div>
                  <div>Industry: {siteData.business.industry.replace('-', ' ')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold mb-4">Test Your Enhanced Widget</h2>
            <p className="text-gray-600 mb-4">
              Click the chat button below to test your advanced AI assistant with lead scoring and real-time notifications.
            </p>
            <button
              onClick={() => setChatOpen(true)}
              className="text-white px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: siteData.branding.primaryColor }}
            >
              🤖 Test Enhanced AI Assistant
            </button>
          </div>
        </main>

        {/* Enhanced Chat Widget for Demo */}
        {chatOpen && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="w-96 h-[600px] bg-white border rounded-2xl shadow-2xl">
              {/* Enhanced Chat Header with Lead Score */}
              <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: siteData.branding.primaryColor }}>
                <div className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm mr-2">
                    🤖
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{siteData.branding.businessName}</div>
                    <div className="text-xs opacity-90">Enhanced AI Assistant</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {leadData.leadScore && (
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold bg-white/20 text-white`}>
                      {leadData.leadScore}
                    </div>
                  )}
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-white hover:bg-white/20 rounded p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Messages with enhanced display */}
              <div className="overflow-y-auto h-[450px] p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.from === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                    style={msg.from === 'user' ? { backgroundColor: siteData.branding.primaryColor } : {}}
                    >
                      <div>{msg.text}</div>
                      <div className={`text-xs mt-1 ${msg.from === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
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

                {/* Enhanced Booking Components */}
                {bookingLink && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <div className="text-sm font-semibold text-green-800 mb-2">🎉 Personalized Booking Link Created!</div>
                    <a 
                      href={bookingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      📅 Book Your Appointment Now
                    </a>
                    <button 
                      onClick={() => setBookingLink(null)}
                      className="text-xs text-gray-500 mt-1 hover:text-gray-700 block"
                    >
                      Close booking link
                    </button>
                  </div>
                )}

                {showBookingWidget && !bookingLink && siteData.integrations?.calendlyUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <div className="text-sm font-semibold text-blue-800 mb-2">📅 Select Your Appointment Time</div>
                    <iframe
                      src={`${siteData.integrations.calendlyUrl}?prefill_email=${leadData.email}&prefill_name=${leadData.name}&hide_gdpr_banner=1`}
                      width="100%"
                      height="300"
                      frameBorder="0"
                      className="rounded"
                      title="Book Appointment"
                    ></iframe>
                    <button 
                      onClick={() => setShowBookingWidget(false)}
                      className="text-xs text-gray-500 mt-1 hover:text-gray-700"
                    >
                      Close calendar
                    </button>
                  </div>
                )}
              </div>

              {/* Enhanced Input with Lead Data Display */}
              <div className="p-4 border-t">
                {/* Lead Data Preview */}
                {(leadData.name || leadData.email || leadData.phone) && (
                  <div className="mb-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <div className="font-semibold">Lead Info Captured:</div>
                    {leadData.name && <div>Name: {leadData.name}</div>}
                    {leadData.email && <div>Email: {leadData.email}</div>}
                    {leadData.phone && <div>Phone: {leadData.phone}</div>}
                    {leadData.leadScore && <div>Score: <span className={getLeadScoreColor(leadData.leadScore).split(' ')[0]}>{leadData.leadScore}</span></div>}
                  </div>
                )}
                
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

  // Full website with integrated enhanced AI
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
              🤖 Chat with AI Assistant
            </button>
            {siteData.integrations?.calendlyUrl && (
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

      {/* Enhanced Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="w-16 h-16 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          style={{ backgroundColor: siteData.branding.primaryColor }}
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Open Enhanced AI chat"
        >
          {chatOpen ? "✕" : "🤖"}
        </button>
        
        {/* Enhanced Full Chat Interface */}
        {chatOpen && (
          <div className="w-96 h-[600px] bg-white border rounded-2xl shadow-2xl p-4 mt-4">
            {/* Enhanced Chat Header with Lead Score */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2"
                     style={{ backgroundColor: siteData.branding.primaryColor }}>
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-sm">{siteData.contact.ownerName}'s AI Assistant</div>
                  <div className="text-xs text-green-500">● Enhanced Lead Scoring</div>
                </div>
              </div>
              {leadData.leadScore && (
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getLeadScoreColor(leadData.leadScore)}`}>
                  {leadData.leadScore}
                </div>
              )}
            </div>

            {/* Enhanced Messages Container */}
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
                    <div className={`text-xs mt-1 ${msg.from === "user" ? "text-white/70" : "text-gray-500"}`}>
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

              {/* Enhanced Booking Components */}
              {bookingLink && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                  <div className="text-sm font-semibold text-green-800 mb-2">🎉 Personalized Booking Link Created!</div>
                  <a 
                    href={bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    📅 Book Your Appointment Now
                  </a>
                  <div className="text-xs text-green-600 mt-1">
                    Click above to see {siteData.contact.ownerName}'s real availability!
                  </div>
                  <button 
                    onClick={() => setBookingLink(null)}
                    className="text-xs text-gray-500 mt-1 hover:text-gray-700 block"
                  >
                    Close booking link
                  </button>
                </div>
              )}

              {showBookingWidget && !bookingLink && siteData.integrations?.calendlyUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="text-sm font-semibold text-blue-800 mb-2">📅 Select Your Appointment Time</div>
                  <iframe
                    src={`${siteData.integrations.calendlyUrl}?prefill_email=${leadData.email}&prefill_name=${leadData.name}&hide_gdpr_banner=1`}
                    width="100%"
                    height="300"
                    frameBorder="0"
                    className="rounded"
                    title="Book Appointment"
                  ></iframe>
                  <button 
                    onClick={() => setShowBookingWidget(false)}
                    className="text-xs text-gray-500 mt-1 hover:text-gray-700"
                  >
                    Close calendar
                  </button>
                </div>
              )}
            </div>

            {/* Enhanced Input Area with Lead Preview */}
            <div>
              {/* Lead Data Preview */}
              {(leadData.name || leadData.email || leadData.phone) && (
                <div className="mb-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-semibold">Lead Info Captured:</div>
                  {leadData.name && <div>Name: {leadData.name}</div>}
                  {leadData.email && <div>Email: {leadData.email}</div>}
                  {leadData.phone && <div>Phone: {leadData.phone}</div>}
                </div>
              )}
              
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
          </div>
        )}
      </div>
    </div>
  );
}
