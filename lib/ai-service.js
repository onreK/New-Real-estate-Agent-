// lib/ai-service.js - FULLY COMPATIBLE WITH YOUR EXISTING DATABASE.JS
import OpenAI from 'openai';
import { query } from './database.js';

// Initialize OpenAI (fallback if not configured)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Hot lead detection keywords
const HOT_LEAD_KEYWORDS = [
  'urgent', 'asap', 'immediately', 'emergency', 'deadline',
  'budget', 'price', 'cost', 'money', 'payment', 'buy', 'purchase',
  'interested', 'ready to start', 'when can we', 'schedule',
  'meeting', 'call me', 'phone', 'contact',
  'problem', 'issue', 'broken', 'not working', 'help',
  'competitor', 'other company', 'comparing', 'quote'
];

/**
 * 🧠 CENTRALIZED AI RESPONSE GENERATOR
 * Compatible with your existing database.js functions
 */
export async function generateAIResponse({ 
  userMessage, 
  channel, 
  customerEmail = null, 
  clerkUserId = null,
  conversationHistory = [],
  channelSpecificData = {}
}) {
  console.log(`🤖 [AI-SERVICE] Generating ${channel} response...`);
  
  try {
    // Step 1: Get customer configuration using YOUR existing database functions
    const customerConfig = await getCustomerAIConfiguration(customerEmail, clerkUserId);
    
    // Step 2: Analyze for hot leads
    const hotLeadAnalysis = await analyzeHotLead(userMessage, conversationHistory, customerConfig);
    
    // Step 3: Build channel-specific AI prompt
    const systemPrompt = buildChannelSpecificPrompt(channel, customerConfig, channelSpecificData);
    
    // Step 4: Generate AI response
    const aiResponse = await callOpenAI(systemPrompt, userMessage, conversationHistory, customerConfig);
    
    // Step 5: Format response for specific channel
    const formattedResponse = formatResponseForChannel(aiResponse, channel, customerConfig);
    
    console.log(`✅ [AI-SERVICE] ${channel} response generated successfully`);
    
    return {
      success: true,
      response: formattedResponse,
      hotLead: hotLeadAnalysis,
      metadata: {
        channel: channel,
        customerConfig: customerConfig ? customerConfig.business_name : 'Default',
        knowledgeBaseUsed: !!(customerConfig?.knowledge_base?.trim()),
        customPromptUsed: !!(customerConfig?.system_prompt?.trim()),
        responseTime: Date.now(),
        tokensUsed: aiResponse.usage?.total_tokens || 0,
        model: customerConfig?.ai_model || customerConfig?.model || 'gpt-4o-mini'
      }
    };
    
  } catch (error) {
    console.error('❌ [AI-SERVICE] Error:', error);
    
    return {
      success: false,
      response: getChannelErrorMessage(channel),
      error: error.message,
      hotLead: { isHotLead: false, score: 0 }
    };
  }
}

/**
 * 📊 Get customer AI configuration - USES YOUR EXISTING DATABASE STRUCTURE
 */
async function getCustomerAIConfiguration(customerEmail, clerkUserId) {
  try {
    let customer = null;
    
    if (clerkUserId) {
      // Use YOUR existing function
      const { getCustomerByClerkId } = await import('./database.js');
      customer = await getCustomerByClerkId(clerkUserId);
    } else if (customerEmail) {
      // Search by email in customers table
      const result = await query(
        'SELECT * FROM customers WHERE email = $1 LIMIT 1',
        [customerEmail]
      );
      customer = result.rows[0] || null;
    }
    
    if (!customer) {
      console.log('⚠️ [AI-SERVICE] No customer found');
      return null;
    }
    
    // Get AI config using YOUR table structure
    let aiConfig = {};
    try {
      const aiConfigResult = await query(
        'SELECT * FROM ai_configs WHERE user_id = $1 LIMIT 1',
        [customer.clerk_user_id || customer.user_id]
      );
      aiConfig = aiConfigResult.rows[0] || {};
    } catch (aiError) {
      console.log('⚠️ [AI-SERVICE] No AI config found');
    }
    
    // Get email settings using YOUR table structure  
    let emailSettings = {};
    try {
      const emailResult = await query(
        'SELECT * FROM email_settings WHERE customer_id = $1 OR user_id = $2 LIMIT 1',
        [customer.id, customer.clerk_user_id || customer.user_id]
      );
      emailSettings = emailResult.rows[0] || {};
    } catch (emailError) {
      console.log('⚠️ [AI-SERVICE] No email settings found');
    }
    
    // Safely get knowledge_base if column exists
    let knowledge_base = '';
    try {
      if (emailSettings.knowledge_base) {
        knowledge_base = emailSettings.knowledge_base;
      }
    } catch (kbError) {
      console.log('⚠️ [AI-SERVICE] knowledge_base column not found');
    }
    
    // Combine all config data
    const config = {
      ...customer,
      ...aiConfig,
      ...emailSettings,
      knowledge_base: knowledge_base
    };
    
    console.log('✅ [AI-SERVICE] Customer config loaded:', {
      business_name: config.business_name,
      has_knowledge_base: !!(knowledge_base?.trim()),
      has_custom_prompt: !!(config.system_prompt?.trim()),
      ai_model: config.model || config.ai_model || 'gpt-4o-mini'
    });
    
    return config;
    
  } catch (error) {
    console.error('❌ [AI-SERVICE] Error loading customer config:', error);
    return null;
  }
}

/**
 * 🔥 Hot lead analysis with AI scoring
 */
async function analyzeHotLead(message, conversationHistory = [], customerConfig = null) {
  try {
    // Basic keyword detection
    const messageContent = message.toLowerCase();
    const keywordMatches = HOT_LEAD_KEYWORDS.filter(keyword => 
      messageContent.includes(keyword.toLowerCase())
    );
    
    // Use customer's custom hot lead keywords if available
    let customKeywordMatches = [];
    if (customerConfig?.hot_lead_keywords && Array.isArray(customerConfig.hot_lead_keywords)) {
      customKeywordMatches = customerConfig.hot_lead_keywords.filter(keyword => 
        messageContent.includes(keyword.toLowerCase())
      );
    }
    
    const totalKeywords = [...keywordMatches, ...customKeywordMatches];
    const basicScore = Math.min(totalKeywords.length * 25, 100);
    
    // AI-powered scoring if OpenAI is available
    if (openai && customerConfig?.lead_detection_enabled !== false) {
      try {
        const aiAnalysis = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a hot lead detection AI. Analyze messages to determine lead urgency (0-100 score).
              
              Hot indicators:
              - Urgency words (urgent, asap, immediately)
              - Buying signals (budget, ready, purchase)
              - Contact requests (call me, meet, schedule)
              - Problem urgency (broken, not working, emergency)
              
              Return JSON: {"score": 0-100, "reasoning": "brief explanation"}`
            },
            {
              role: 'user',
              content: `Message: "${message}"\nContext: ${conversationHistory.slice(-3).map(h => h.content || h.body || '').join(' ')}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        });
        
        const aiResult = JSON.parse(aiAnalysis.choices[0].message.content);
        const finalScore = Math.max(basicScore, aiResult.score);
        
        return {
          isHotLead: finalScore >= 60,
          score: finalScore,
          reasoning: aiResult.reasoning,
          keywords: totalKeywords,
          analysisMethod: 'ai_enhanced'
        };
        
      } catch (aiError) {
        console.error('⚠️ [AI-SERVICE] AI hot lead analysis failed:', aiError);
      }
    }
    
    // Fallback to keyword-based scoring
    return {
      isHotLead: basicScore >= 60,
      score: basicScore,
      reasoning: totalKeywords.length > 0 ? `Detected keywords: ${totalKeywords.join(', ')}` : 'No hot lead indicators',
      keywords: totalKeywords,
      analysisMethod: 'keyword_based'
    };
    
  } catch (error) {
    console.error('❌ [AI-SERVICE] Hot lead analysis error:', error);
    return { isHotLead: false, score: 0, reasoning: 'Analysis failed', keywords: [] };
  }
}

/**
 * 🎯 Build channel-specific AI prompts
 */
function buildChannelSpecificPrompt(channel, customerConfig, channelData = {}) {
  const businessName = customerConfig?.business_name || 'My Business';
  const knowledge = customerConfig?.knowledge_base?.trim() || '';
  const customPrompt = customerConfig?.system_prompt?.trim() || '';
  const personality = customerConfig?.ai_personality || customerConfig?.tone || 'professional';
  
  // Base prompt with business knowledge
  let basePrompt = `You are an AI assistant representing ${businessName}.`;
  
  // Add knowledge base if available
  if (knowledge) {
    basePrompt += `\n\nBUSINESS KNOWLEDGE:\n${knowledge}`;
  }
  
  // Add custom system prompt if available
  if (customPrompt && customPrompt !== 'You are a helpful AI assistant.') {
    basePrompt += `\n\nCUSTOM INSTRUCTIONS:\n${customPrompt}`;
  }
  
  // Channel-specific formatting and behavior
  const channelInstructions = {
    sms: `
      SMS GUIDELINES:
      - Keep responses under 160 characters when possible
      - Be concise and direct
      - Use emojis sparingly
      - If complex response needed, offer to call or email
      - Always be ${personality}`,
      
    gmail: `
      EMAIL GUIDELINES:
      - Write professional email responses
      - Use proper email formatting
      - Be detailed but concise
      - Include relevant business information
      - Maintain ${personality} tone
      - Sign off appropriately for ${businessName}`,
      
    facebook: `
      FACEBOOK MESSENGER GUIDELINES:
      - Keep responses conversational and friendly
      - Use casual but ${personality} tone
      - Emojis are appropriate for social media
      - Be helpful and engaging
      - Encourage further conversation`,
      
    instagram: `
      INSTAGRAM GUIDELINES:
      - Use trendy, social media appropriate language
      - Be visual and engaging in descriptions
      - Use relevant emojis
      - Keep it fun but ${personality}
      - Encourage visual content sharing`,
      
    email: `
      EMAIL SYSTEM GUIDELINES:
      - Professional email communication
      - Detailed responses appropriate for email
      - Include business context and information
      - Be ${personality} and helpful
      - Proper email etiquette`,
      
    chat: `
      WEB CHAT GUIDELINES:
      - Conversational and helpful
      - Immediate assistance focus
      - Can be detailed since space isn't limited
      - Be ${personality} and engaging
      - Guide towards business goals`
  };
  
  const channelInstruction = channelInstructions[channel] || channelInstructions.chat;
  
  // Add channel-specific data context
  if (channelData.subject && channel === 'gmail') {
    basePrompt += `\n\nEMAIL SUBJECT: "${channelData.subject}"`;
  }
  
  if (channelData.phoneNumber && channel === 'sms') {
    basePrompt += `\n\nSMS CONVERSATION with ${channelData.phoneNumber}`;
  }
  
  return basePrompt + '\n\n' + channelInstruction + '\n\nAlways be helpful, accurate, and represent the business professionally.';
}

/**
 * 🤖 Call OpenAI with proper configuration
 */
async function callOpenAI(systemPrompt, userMessage, conversationHistory, customerConfig) {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }
  
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add conversation history (limit to last 10 messages for context)
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role || (msg.sender_type === 'user' ? 'user' : 'assistant'),
        content: msg.content || msg.body || msg.message || ''
      });
    }
  }
  
  // Add current user message
  messages.push({ role: 'user', content: userMessage });
  
  const completion = await openai.chat.completions.create({
    model: customerConfig?.model || customerConfig?.ai_model || 'gpt-4o-mini',
    messages: messages,
    max_tokens: customerConfig?.max_tokens || 500,
    temperature: customerConfig?.temperature || 0.7
  });
  
  return completion;
}

/**
 * 📱 Format response for specific channels
 */
function formatResponseForChannel(aiResponse, channel, customerConfig) {
  const response = aiResponse.choices[0]?.message?.content || '';
  
  switch (channel) {
    case 'sms':
      // SMS: Truncate if too long, suggest alternative
      if (response.length > 160) {
        return response.substring(0, 150) + '... (call for more info)';
      }
      return response;
      
    case 'gmail':
    case 'email':
      // Email: Add professional signature
      const businessName = customerConfig?.business_name || 'My Business';
      return response + `\n\n--\nBest regards,\n${businessName}`;
      
    case 'facebook':
    case 'instagram':
      // Social: Keep as-is, AI already formatted for social media
      return response;
      
    case 'chat':
    default:
      // Chat: Return as-is
      return response;
  }
}

/**
 * ❌ Channel-specific error messages
 */
function getChannelErrorMessage(channel) {
  const messages = {
    sms: "I'm having a brief technical issue, but I'd be happy to help! Please try again in a moment.",
    gmail: "Thank you for your email. I'm experiencing some technical difficulties right now, but I'll make sure someone gets back to you soon.",
    facebook: "Thanks for reaching out! I'm having a brief technical issue, but I'd love to help you. Please try again in a moment! 😊",
    instagram: "Hey! Thanks for the message! I'm having a quick tech issue but I'll be right back to help! ✨",
    email: "Thank you for contacting us. We're experiencing some technical difficulties but will respond as soon as possible.",
    chat: "I'm having a brief technical issue. Please try again in a moment, and I'll be happy to help!"
  };
  
  return messages[channel] || messages.chat;
}

/**
 * 🔧 UTILITY FUNCTIONS FOR CHANNELS
 */

// Quick function for SMS webhook
export async function generateSMSResponse(phoneNumber, message, conversationHistory = []) {
  return generateAIResponse({
    userMessage: message,
    channel: 'sms',
    customerEmail: null,
    conversationHistory: conversationHistory,
    channelSpecificData: { phoneNumber }
  });
}

// Quick function for Gmail monitor
export async function generateGmailResponse(customerEmail, emailContent, subject, conversationHistory = []) {
  return generateAIResponse({
    userMessage: emailContent,
    channel: 'gmail',
    customerEmail: customerEmail,
    conversationHistory: conversationHistory,
    channelSpecificData: { subject }
  });
}

// Quick function for Facebook webhook
export async function generateFacebookResponse(pageId, message, conversationHistory = []) {
  return generateAIResponse({
    userMessage: message,
    channel: 'facebook',
    customerEmail: null,
    conversationHistory: conversationHistory,
    channelSpecificData: { pageId }
  });
}

// Quick function for web chat
export async function generateChatResponse(clerkUserId, message, conversationHistory = []) {
  return generateAIResponse({
    userMessage: message,
    channel: 'chat',
    clerkUserId: clerkUserId,
    conversationHistory: conversationHistory
  });
}
