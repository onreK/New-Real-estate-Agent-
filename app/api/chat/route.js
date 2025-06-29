// MODIFICATION FOR YOUR EXISTING app/api/chat/route.js
// Add this code to your existing file

// 1. ADD THIS IMPORT at the top (after your existing imports):
import { emailService } from '../../../lib/email-automation-service.js';

// 2. ADD THIS FUNCTION after your existing HOT_LEAD_KEYWORDS array:
function calculateLeadScore(message) {
  const messageLC = message.toLowerCase();
  let score = 20; // Base score

  // Check for hot keywords (high intent)
  const matchedKeywords = HOT_LEAD_KEYWORDS.filter(keyword => 
    messageLC.includes(keyword.toLowerCase())
  );
  
  if (matchedKeywords.length > 0) {
    score += matchedKeywords.length * 25; // Each hot keyword adds 25 points
  }

  // Additional scoring
  if (messageLC.length > 100) score += 10; // Detailed messages
  if (messageLC.includes('?')) score += 5; // Questions show engagement
  if (messageLC.includes('budget') || messageLC.includes('price')) score += 15;
  if (messageLC.includes('timeline') || messageLC.includes('when')) score += 10;

  return Math.max(0, Math.min(100, score)); // Keep between 0-100
}

// 3. ADD THIS FUNCTION to extract lead info from conversation:
async function extractLeadFromConversation(conversationId) {
  try {
    // Get all messages from this conversation
    const messages = await getConversationMessages(conversationId);
    
    if (messages.length === 0) return null;

    // Combine all messages to extract lead info
    const fullConversation = messages.map(msg => msg.content).join(' ');
    
    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const email = fullConversation.match(emailRegex)?.[0];
    
    if (!email) return null; // No lead if no email
    
    // Extract phone
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    const phone = fullConversation.match(phoneRegex)?.[0];
    
    // Extract name (look for common patterns)
    const namePatterns = [
      /my name is (\w+(?:\s+\w+)?)/i,
      /i'm (\w+(?:\s+\w+)?)/i,
      /this is (\w+(?:\s+\w+)?)/i,
      /call me (\w+(?:\s+\w+)?)/i,
      /i am (\w+(?:\s+\w+)?)/i
    ];
    
    let name = '';
    for (const pattern of namePatterns) {
      const match = fullConversation.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    return {
      name: name || 'Lead',
      email,
      phone,
      businessType: 'real estate' // You can modify this based on conversation context
    };

  } catch (error) {
    console.error('Error extracting lead:', error);
    return null;
  }
}

// 4. ADD THIS CODE in your existing POST function, right after you create the hot lead alert:

// FIND THIS SECTION in your existing code:
      if (matchedKeywords.length > 0) {
        await createHotLeadAlert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          trigger_message: userMessage.content,
          keywords_matched: matchedKeywords,
          status: 'new'
        });
        
        console.log('🔥 HOT LEAD DETECTED! Keywords:', matchedKeywords);
        
        // 🆕 ADD THIS NEW EMAIL AUTOMATION CODE HERE:
        try {
          // Calculate lead score
          const leadScore = calculateLeadScore(userMessage.content);
          console.log('📊 Lead score calculated:', leadScore);
          
          // Extract lead information from conversation
          const leadInfo = await extractLeadFromConversation(conversation.id);
          
          if (leadInfo && leadInfo.email) {
            console.log('📧 Triggering email automation for:', leadInfo.email);
            
            // Trigger email automation
            const emailResult = await emailService.handleChatbotLead({
              name: leadInfo.name,
              email: leadInfo.email,
              phone: leadInfo.phone,
              businessType: leadInfo.businessType,
              message: userMessage.content,
              userId: userId,
              score: leadScore
            });
            
            console.log('✅ Email automation result:', emailResult);
          } else {
            console.log('📧 No email found in conversation, skipping email automation');
          }
        } catch (emailError) {
          console.error('❌ Email automation failed:', emailError);
          // Don't break the chatbot if email fails
        }
        // 🆕 END OF NEW EMAIL AUTOMATION CODE
      }

// That's it! The rest of your existing code stays exactly the same.
