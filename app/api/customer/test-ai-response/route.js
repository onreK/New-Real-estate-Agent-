// app/api/customer/test-ai-response/route.js - UPDATED WITH EVENT TRACKING
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { generateEmailResponse } from '@/lib/ai-service.js';
import { analyzeBehaviors, trackBehaviorEvents } from '@/lib/behavior-analyzer.js';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, settings } = await request.json();
    
    if (!message) {
      return NextResponse.json({ 
        error: 'Test message is required' 
      }, { status: 400 });
    }

    console.log('🧪 Testing AI response for user:', user.emailAddresses?.[0]?.emailAddress);

    try {
      // Get customer ID for tracking
      const customerEmail = user.emailAddresses?.[0]?.emailAddress;
      let customerId = null;
      
      try {
        const customerResult = await query(
          'SELECT id FROM customers WHERE email = $1 OR clerk_user_id = $2 LIMIT 1',
          [customerEmail, user.id]
        );
        if (customerResult.rows.length > 0) {
          customerId = customerResult.rows[0].id;
        }
      } catch (dbError) {
        console.log('Could not get customer ID:', dbError.message);
      }
      
      // Generate AI response using centralized service
      const aiResult = await generateEmailResponse(
        customerEmail,
        message,
        'Test Email Subject',
        [] // empty conversation history for test
      );

      if (!aiResult.success) {
        throw new Error(aiResult.error || 'AI service failed');
      }

      // 🎯 TRACK BEHAVIOR EVENTS
      let eventsTracked = 0;
      let trackedEvents = [];
      let detectedBehaviors = [];
      
      if (customerId) {
        // Track events in database
        const trackingResult = await trackBehaviorEvents(
          customerId,
          aiResult.response,
          message,
          'email_test'
        );
        eventsTracked = trackingResult.eventsTracked || 0;
        trackedEvents = trackingResult.events || [];
        console.log(`📊 Test tracked ${eventsTracked} events`);
      } else {
        // Just analyze behaviors without saving (no customer ID)
        detectedBehaviors = analyzeBehaviors(aiResult.response, message, 'email_test');
        console.log(`📊 Detected ${detectedBehaviors.length} behaviors (not saved - no customer ID)`);
      }

      console.log('✅ AI test response generated successfully');

      return NextResponse.json({
        success: true,
        response: aiResult.response,
        eventsTracked: eventsTracked, // 🎯 NOW INCLUDED
        trackedEvents: trackedEvents, // 🎯 NOW INCLUDED
        detectedBehaviors: customerId ? trackedEvents : detectedBehaviors, // Show what was detected
        hotLead: {
          isHotLead: aiResult.hotLead?.isHotLead || false,
          score: aiResult.hotLead?.score || 0,
          reasoning: aiResult.hotLead?.reasoning || 'Standard lead analysis completed'
        },
        metadata: {
          model: aiResult.metadata?.model || settings?.ai_model || 'gpt-4o-mini',
          tokensUsed: aiResult.metadata?.tokensUsed || 0,
          knowledgeBaseUsed: aiResult.metadata?.knowledgeBaseUsed || false,
          customPromptUsed: aiResult.metadata?.customPromptUsed || false,
          responseTime: Date.now(),
          temperature: settings?.ai_temperature || 0.7,
          maxTokens: settings?.ai_max_tokens || 350,
          channel: 'email_test',
          customerId: customerId // Show if customer was found
        },
        testSettings: {
          ai_model: settings?.ai_model || 'gpt-4o-mini',
          ai_temperature: settings?.ai_temperature || 0.7,
          response_length: settings?.response_length || 'medium',
          enable_hot_lead_analysis: settings?.enable_hot_lead_analysis !== false,
          enable_ai_responses: settings?.enable_ai_responses !== false,
          has_custom_instructions: !!(settings?.ai_system_prompt || settings?.custom_instructions),
          has_knowledge_base: !!(settings?.knowledge_base?.trim())
        }
      });

    } catch (aiError) {
      console.error('❌ AI service error:', aiError);
      
      // Fallback response for testing
      const fallbackResponse = generateFallbackTestResponse(message, settings);
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse.response,
        eventsTracked: 0,
        trackedEvents: [],
        hotLead: fallbackResponse.hotLead,
        metadata: {
          model: 'fallback',
          tokensUsed: 0,
          knowledgeBaseUsed: false,
          customPromptUsed: false,
          responseTime: Date.now(),
          error: 'Used fallback - centralized AI service unavailable'
        },
        warning: 'Using fallback response - centralized AI service unavailable',
        error: aiError.message
      });
    }

  } catch (error) {
    console.error('❌ Error testing AI response:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test AI response',
      details: error.message 
    }, { status: 500 });
  }
}

// Fallback response generator for testing when AI service is unavailable
function generateFallbackTestResponse(message, settings) {
  const businessName = settings?.business_name || 'Your Business';
  const tone = settings?.tone || 'professional';
  const expertise = settings?.expertise || 'your industry';
  
  // Simple hot lead detection based on keywords
  const hotLeadKeywords = settings?.hot_lead_keywords || ['urgent', 'asap', 'immediately', 'budget', 'ready', 'buying now'];
  const messageWords = message.toLowerCase();
  const foundKeywords = hotLeadKeywords.filter(keyword => messageWords.includes(keyword.toLowerCase()));
  const isHotLead = foundKeywords.length > 0;
  const score = Math.min(foundKeywords.length * 25, 100);

  // Generate response based on tone
  let response = '';
  
  if (tone === 'casual') {
    response = `Hey there! Thanks for reaching out. I'd be happy to help you with ${expertise}. `;
  } else if (tone === 'formal') {
    response = `Dear Valued Customer, Thank you for your inquiry regarding ${expertise}. `;
  } else {
    response = `Hello! Thank you for contacting ${businessName}. I'd be glad to assist you with ${expertise}. `;
  }

  // Add urgency response for hot leads
  if (isHotLead) {
    response += `I understand this is ${foundKeywords.join(' and ')} for you. Let me prioritize your request. `;
  }

  // Add custom instructions if present
  if (settings?.ai_system_prompt?.includes('phone')) {
    response += `Could you please provide your phone number so I can give you a quick call? `;
  }

  if (settings?.schedule_within_24h) {
    response += `I'd love to schedule a time to discuss this within the next 24 hours. `;
  }

  response += `How can I best assist you today?`;

  return {
    response: response,
    hotLead: {
      isHotLead: isHotLead,
      score: score,
      reasoning: isHotLead ? `Hot lead detected: ${foundKeywords.join(', ')}` : 'Standard inquiry'
    }
  };
}
