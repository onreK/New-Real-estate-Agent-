// lib/email-automation-service.js
// Email automation service that integrates with your existing database

import { Resend } from 'resend';
import OpenAI from 'openai';
import { db } from './database.js'; // Your existing database connection

const resend = new Resend(process.env.RESEND_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class EmailAutomationService {
  
  // ========================================
  // AI EMAIL GENERATION
  // ========================================

  async generateEmailContent(leadData, aiConfig = {}, templateType = 'follow_up') {
    const prompt = this.buildAIPrompt(leadData, aiConfig, templateType);
    
    try {
      const completion = await openai.chat.completions.create({
        model: aiConfig.creativityLevel && aiConfig.creativityLevel > 0.7 ? 'gpt-4o' : 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: aiConfig.creativityLevel || 0.6,
        max_tokens: this.getMaxTokens(aiConfig.emailLength || 'medium')
      });

      const response = completion.choices[0].message.content;
      const parsed = this.parseAIResponse(response);

      // Log the generation for optimization
      await this.logAIGeneration({
        userId: leadData.userId,
        leadData,
        prompt,
        generatedSubject: parsed.subject,
        generatedContent: parsed.htmlContent,
        aiConfig,
        tokensUsed: completion.usage?.total_tokens || 0
      });

      return parsed;
    } catch (error) {
      console.error('Error generating AI email:', error);
      throw error;
    }
  }

  buildAIPrompt(leadData, aiConfig, templateType) {
    const personality = aiConfig.personality || 'Professional & Friendly';
    const businessContext = aiConfig.knowledgeBase || 'We provide excellent real estate services and are here to help with your property needs.';
    const customInstructions = aiConfig.customInstructions || '';
    
    return `
You are an AI email assistant for a real estate professional. Generate a ${templateType} email with the following requirements:

LEAD INFORMATION:
- Name: ${leadData.name || 'there'}
- Business Type: ${leadData.businessType || 'real estate'}
- Lead Score: ${leadData.score || 0} (0=cold, 50=warm, 100=hot)
- Original Message: "${leadData.message || 'Showed interest in real estate services'}"

BUSINESS CONTEXT:
${businessContext}

EMAIL PERSONALITY: ${personality}
EMAIL LENGTH: ${aiConfig.emailLength || 'medium'}
CAMPAIGN TYPE: ${aiConfig.campaignType || 'lead nurturing'}
SUBJECT LINE STYLE: ${aiConfig.subjectLineStyle || 'engaging'}

CUSTOM INSTRUCTIONS:
${customInstructions}

REQUIREMENTS:
1. Generate a compelling subject line
2. Create personalized HTML email content
3. Include a clear call-to-action (schedule consultation, call, etc.)
4. Make it ${personality.toLowerCase()} in tone
5. Reference their original message naturally
6. Format response as JSON: {"subject": "...", "htmlContent": "...", "textContent": "..."}

Generate the email now:`;
  }

  parseAIResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        subject: parsed.subject || 'Follow Up',
        htmlContent: parsed.htmlContent || parsed.content || response,
        textContent: parsed.textContent || this.stripHtml(parsed.htmlContent || parsed.content || response)
      };
    } catch {
      // Fallback if JSON parsing fails
      const lines = response.split('\n').filter(line => line.trim());
      return {
        subject: lines[0] || 'Follow Up',
        htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${response.replace(/\n/g, '<br>')}</div>`,
        textContent: response
      };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  getMaxTokens(length) {
    switch (length) {
      case 'short': return 200;
      case 'medium': return 400;
      case 'long': return 600;
      default: return 400;
    }
  }

  // ========================================
  // EMAIL SENDING (Uses your existing Resend setup)
  // ========================================

  async sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    fromName = 'Your Real Estate Team',
    fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  }) {
    
    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email sent successfully:', data?.id);
      return { success: true, emailId: data?.id };
      
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // INTEGRATION WITH YOUR EXISTING HOT LEAD SYSTEM
  // ========================================

  async handleChatbotLead(leadData) {
    try {
      console.log('📧 Processing chatbot lead for email automation:', leadData.email);

      const leadScore = leadData.score || 0;

      // Get user's AI email configuration (you can expand this later)
      const aiConfig = await this.getUserEmailConfig(leadData.userId);

      if (leadScore >= 70) {
        // HOT LEAD - Send immediate follow-up email
        console.log('🔥 HOT LEAD - Sending immediate email');
        
        const emailContent = await this.generateEmailContent(leadData, {
          ...aiConfig,
          campaignType: 'hot_lead_follow_up'
        }, 'hot_lead');

        const emailResult = await this.sendEmail({
          to: leadData.email,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          textContent: emailContent.textContent
        });

        // Store email record in database (you can expand this)
        await this.logEmailSend({
          leadData,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          status: emailResult.success ? 'sent' : 'failed',
          resendId: emailResult.emailId,
          error: emailResult.error
        });

        return { 
          success: true, 
          action: 'hot_lead_email_sent', 
          leadScore,
          emailSent: emailResult.success
        };
        
      } else if (leadScore >= 30) {
        // WARM LEAD - Send welcome email
        console.log('🟡 WARM LEAD - Sending welcome email');
        
        const emailContent = await this.generateEmailContent(leadData, {
          ...aiConfig,
          campaignType: 'welcome'
        }, 'welcome');

        const emailResult = await this.sendEmail({
          to: leadData.email,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          textContent: emailContent.textContent
        });

        await this.logEmailSend({
          leadData,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          status: emailResult.success ? 'sent' : 'failed',
          resendId: emailResult.emailId,
          error: emailResult.error
        });
        
        return { 
          success: true, 
          action: 'welcome_email_sent', 
          leadScore,
          emailSent: emailResult.success
        };
        
      } else {
        // COLD LEAD - Just log for future campaigns
        console.log('❄️ COLD LEAD - Logged for future campaigns');
        return { 
          success: true, 
          action: 'lead_logged', 
          leadScore,
          emailSent: false
        };
      }

    } catch (error) {
      console.error('Error handling chatbot lead:', error);
      return { 
        success: false, 
        error: error.message,
        leadScore: leadData.score || 0
      };
    }
  }

  // ========================================
  // USER CONFIGURATION (Simple version for now)
  // ========================================

  async getUserEmailConfig(userId) {
    // For now, return default config
    // You can expand this to store/retrieve from database later
    return {
      personality: 'Professional & Friendly',
      creativityLevel: 0.6,
      emailLength: 'medium',
      campaignType: 'lead_nurturing',
      subjectLineStyle: 'engaging',
      knowledgeBase: 'We are a professional real estate team dedicated to helping you buy, sell, or invest in property. Our experienced agents provide personalized service and market expertise.',
      customInstructions: 'Always offer to schedule a consultation and provide your contact information.'
    };
  }

  // ========================================
  // LOGGING (Simple logging for now)
  // ========================================

  async logAIGeneration(data) {
    try {
      console.log('📝 AI Email Generated:', {
        userId: data.userId,
        email: data.leadData.email,
        subject: data.generatedSubject,
        tokens: data.tokensUsed
      });
      
      // You can expand this to store in your database later
      
    } catch (error) {
      console.error('Error logging AI generation:', error);
    }
  }

  async logEmailSend(data) {
    try {
      console.log('📧 Email Send Logged:', {
        email: data.leadData.email,
        subject: data.subject,
        status: data.status,
        resendId: data.resendId
      });
      
      // You can expand this to store in your database later
      // This would integrate with your existing database structure
      
    } catch (error) {
      console.error('Error logging email send:', error);
    }
  }

  // ========================================
  // EMAIL STATS (Simple version)
  // ========================================

  async getEmailStats(userId) {
    // Simple stats for now - you can expand this
    return {
      totalSent: 0,
      openRate: 0,
      clickRate: 0,
      responseRate: 0
    };
  }
}

// Export singleton instance
export const emailService = new EmailAutomationService();
