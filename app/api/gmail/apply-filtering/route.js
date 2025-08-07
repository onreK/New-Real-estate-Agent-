// app/api/gmail/apply-filtering/route.js
// Extension to Gmail monitor that applies email filtering
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/database';
import { checkEmailFilter, logFilteredEmail } from '@/lib/email-filtering';
import { generateGmailResponse } from '@/lib/ai-service';
import { currentUser } from '@clerk/nextjs';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Helper function to safely parse JSON
function tryParseJSON(jsonString, defaultValue = []) {
  try {
    if (!jsonString) return defaultValue;
    if (typeof jsonString === 'object') return jsonString;
    if (Array.isArray(jsonString)) return jsonString;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { emailAddress, messageId, action = 'filter', emails } = body;
    
    // For test action, we don't need Gmail connection
    if (action === 'test') {
      return handleTestAction();
    }
    
    // For check action without emailAddress, use current user
    if (action === 'check' && !emailAddress) {
      return handleCheckAction(emails);
    }
    
    // Original flow for Gmail-connected actions
    if (!emailAddress) {
      return NextResponse.json({ 
        error: 'Email address required for this action' 
      }, { status: 400 });
    }
    
    console.log('📧 Applying email filtering for:', emailAddress);
    
    // Get Gmail connection and customer settings
    const connectionQuery = `
      SELECT gc.*, c.id as customer_id, c.business_name,
             es.auto_archive_spam, es.block_mass_emails, es.personal_only,
             es.skip_auto_generated, es.blacklist_emails, es.whitelist_emails,
             es.priority_keywords, es.auto_response_enabled,
             es.knowledge_base, es.hot_lead_keywords
      FROM gmail_connections gc
      JOIN customers c ON gc.user_id = c.clerk_user_id
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE gc.gmail_email = $1 AND gc.status = 'connected'
      LIMIT 1
    `;
    
    const result = await query(connectionQuery, [emailAddress]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Gmail connection not found or not connected' 
      }, { status: 404 });
    }
    
    const connection = result.rows[0];
    const filterSettings = result.rows[0]; // Contains all the filtering settings
    
    // Set up OAuth client
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expiry_date: connection.token_expiry
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    if (action === 'filter') {
      // Get unread emails and apply filtering
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 20
      });
      
      const messages = response.data.messages || [];
      console.log(`📬 Found ${messages.length} unread emails to filter`);
      
      const filterResults = [];
      const processedEmails = [];
      
      for (const message of messages) {
        try {
          // Get full message details
          const messageData = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          // Extract email data
          const headers = messageData.data.payload.headers;
          const fromHeader = headers.find(h => h.name === 'From');
          const subjectHeader = headers.find(h => h.name === 'Subject');
          const listIdHeader = headers.find(h => h.name === 'List-Id');
          const precedenceHeader = headers.find(h => h.name === 'Precedence');
          
          const from = fromHeader?.value || '';
          const subject = subjectHeader?.value || '';
          const threadId = messageData.data.threadId;
          
          // Get email body
          let body = '';
          try {
            if (messageData.data.payload.body?.data) {
              body = Buffer.from(messageData.data.payload.body.data, 'base64').toString();
            } else if (messageData.data.payload.parts) {
              const textPart = messageData.data.payload.parts.find(part => 
                part.mimeType === 'text/plain'
              );
              if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString();
              }
            }
            if (!body) {
              body = messageData.data.snippet || '';
            }
          } catch (bodyError) {
            body = messageData.data.snippet || '';
          }
          
          // Check if it's auto-generated or mass email
          const isAutoGenerated = !!(
            precedenceHeader?.value?.toLowerCase().includes('bulk') ||
            precedenceHeader?.value?.toLowerCase().includes('list') ||
            from.toLowerCase().includes('noreply') ||
            from.toLowerCase().includes('no-reply')
          );
          
          const isMassEmail = !!(
            listIdHeader ||
            headers.find(h => h.name === 'List-Unsubscribe') ||
            body.toLowerCase().includes('unsubscribe') ||
            body.toLowerCase().includes('email preferences')
          );
          
          // Apply filtering rules
          const filterResult = await checkEmailFilter({
            from,
            subject,
            body,
            isAutoGenerated,
            isMassEmail
          }, filterSettings);
          
          filterResult.messageId = message.id;
          filterResult.threadId = threadId;
          filterResult.from = from;
          filterResult.subject = subject;
          
          // Take action based on filter result
          if (filterResult.shouldFilter) {
            console.log(`🚫 Filtering email from ${from}: ${filterResult.reason}`);
            
            // Log the filtered email
            await logFilteredEmail(
              connection.customer_id,
              connection.id,
              {
                from,
                subject,
                messageId: message.id,
                threadId
              },
              filterResult
            );
            
            // Archive the email (remove from inbox)
            if (filterSettings.auto_archive_spam !== false) {
              await gmail.users.messages.modify({
                userId: 'me',
                id: message.id,
                requestBody: {
                  removeLabelIds: ['INBOX'],
                  addLabelIds: ['SPAM']
                }
              });
              console.log(`🗂️ Archived filtered email: ${subject}`);
            }
            
            filterResults.push({
              ...filterResult,
              action: 'filtered'
            });
          } else {
            // Email passed filters
            console.log(`✅ Email passed filters from ${from}`);
            
            // Check if it's a priority email
            if (filterResult.isPriority) {
              console.log(`⭐ Priority email detected: ${filterResult.matchedKeyword}`);
              
              // Mark it as important
              await gmail.users.messages.modify({
                userId: 'me',
                id: message.id,
                requestBody: {
                  addLabelIds: ['IMPORTANT']
                }
              });
            }
            
            // Check for hot lead and prepare for AI response if enabled
            if (filterSettings.auto_response_enabled !== false) {
              const hotLeadAnalysis = await analyzeHotLead(
                body,
                subject,
                filterSettings.hot_lead_keywords || ['urgent', 'asap', 'budget', 'ready']
              );
              
              if (hotLeadAnalysis.isHotLead) {
                console.log(`🔥 Hot lead detected! Score: ${hotLeadAnalysis.score}`);
                
                processedEmails.push({
                  id: message.id,
                  threadId,
                  from,
                  subject,
                  body,
                  isHotLead: true,
                  hotLeadScore: hotLeadAnalysis.score,
                  hotLeadReason: hotLeadAnalysis.reasoning
                });
              }
            }
            
            filterResults.push({
              ...filterResult,
              action: 'allowed',
              isPriority: filterResult.isPriority || false
            });
          }
          
        } catch (messageError) {
          console.error('Error processing message:', messageError);
        }
      }
      
      // Update statistics
      await updateFilterStatistics(connection.customer_id, filterResults);
      
      return NextResponse.json({
        success: true,
        totalEmails: messages.length,
        filtered: filterResults.filter(r => r.action === 'filtered').length,
        allowed: filterResults.filter(r => r.action === 'allowed').length,
        priority: filterResults.filter(r => r.isPriority).length,
        hotLeads: processedEmails.filter(e => e.isHotLead).length,
        results: filterResults,
        processedForAI: processedEmails
      });
      
    } else if (action === 'get-stats') {
      // Get filtering statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_filtered,
          filter_type,
          COUNT(DISTINCT email_from) as unique_senders,
          MAX(filtered_at) as last_filtered
        FROM email_filter_logs
        WHERE customer_id = $1
          AND filtered_at >= NOW() - INTERVAL '7 days'
        GROUP BY filter_type
      `;
      
      const statsResult = await query(statsQuery, [connection.customer_id]);
      
      return NextResponse.json({
        success: true,
        stats: {
          last7Days: statsResult.rows,
          totalFiltered: statsResult.rows.reduce((sum, row) => sum + parseInt(row.total_filtered), 0)
        }
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Email filtering error:', error);
    return NextResponse.json({
      success: false,
      error: 'Email filtering failed',
      details: error.message
    }, { status: 500 });
  }
}

// Handle test action - no Gmail required
async function handleTestAction() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get customer settings
    const settingsQuery = `
      SELECT c.id as customer_id, c.business_name,
             es.auto_archive_spam, es.block_mass_emails, es.personal_only,
             es.skip_auto_generated, es.blacklist_emails, es.whitelist_emails,
             es.priority_keywords
      FROM customers c
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE c.clerk_user_id = $1
      LIMIT 1
    `;
    
    const result = await query(settingsQuery, [user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Customer settings not found' 
      }, { status: 404 });
    }
    
    const filterSettings = result.rows[0];
    
    // Test with sample email
    const testEmail = {
      from: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email to check your filtering rules.',
      isAutoGenerated: false,
      isMassEmail: false
    };
    
    const filterResult = await checkEmailFilter(testEmail, filterSettings);
    
    return NextResponse.json({
      success: true,
      testResult: filterResult,
      settings: {
        blacklist: tryParseJSON(filterSettings.blacklist_emails, []),
        whitelist: tryParseJSON(filterSettings.whitelist_emails, []),
        keywords: tryParseJSON(filterSettings.priority_keywords, []),
        spamFilter: filterSettings.auto_archive_spam !== false,
        massEmailFilter: filterSettings.block_mass_emails !== false,
        personalOnly: filterSettings.personal_only === true,
        skipAutoGenerated: filterSettings.skip_auto_generated !== false
      }
    });
    
  } catch (error) {
    console.error('Test action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

// Handle check action - test filtering on provided emails
async function handleCheckAction(emails) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ 
        error: 'Emails array required for check action' 
      }, { status: 400 });
    }
    
    // Get customer settings
    const settingsQuery = `
      SELECT c.id as customer_id, c.business_name,
             es.auto_archive_spam, es.block_mass_emails, es.personal_only,
             es.skip_auto_generated, es.blacklist_emails, es.whitelist_emails,
             es.priority_keywords
      FROM customers c
      LEFT JOIN email_settings es ON c.id = es.customer_id
      WHERE c.clerk_user_id = $1
      LIMIT 1
    `;
    
    const result = await query(settingsQuery, [user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Customer settings not found' 
      }, { status: 404 });
    }
    
    const filterSettings = result.rows[0];
    const filterResults = [];
    
    for (const email of emails) {
      try {
        // Detect if it's auto-generated or mass email
        const isAutoGenerated = !!(
          email.from?.toLowerCase().includes('noreply') ||
          email.from?.toLowerCase().includes('no-reply') ||
          email.headers?.find(h => h.name === 'Precedence' && 
            (h.value?.toLowerCase().includes('bulk') || h.value?.toLowerCase().includes('list')))
        );
        
        const isMassEmail = !!(
          email.headers?.find(h => h.name === 'List-Id') ||
          email.headers?.find(h => h.name === 'List-Unsubscribe') ||
          email.body?.toLowerCase().includes('unsubscribe') ||
          email.body?.toLowerCase().includes('email preferences')
        );
        
        // Apply filtering rules
        const filterResult = await checkEmailFilter({
          from: email.from || '',
          subject: email.subject || '',
          body: email.body || email.snippet || '',
          isAutoGenerated,
          isMassEmail
        }, filterSettings);
        
        filterResult.emailId = email.id;
        filterResult.from = email.from;
        filterResult.subject = email.subject;
        
        filterResults.push(filterResult);
        
      } catch (emailError) {
        console.error('Error processing email:', emailError);
        filterResults.push({
          emailId: email.id,
          error: 'Failed to process',
          details: emailError.message
        });
      }
    }
    
    // Count results
    const filtered = filterResults.filter(r => r.shouldFilter).length;
    const allowed = filterResults.filter(r => !r.shouldFilter && !r.error).length;
    const priority = filterResults.filter(r => r.isPriority).length;
    
    return NextResponse.json({
      success: true,
      totalEmails: emails.length,
      filtered,
      allowed,
      priority,
      results: filterResults,
      settings: {
        blacklistCount: tryParseJSON(filterSettings.blacklist_emails, []).length,
        whitelistCount: tryParseJSON(filterSettings.whitelist_emails, []).length,
        keywordsCount: tryParseJSON(filterSettings.priority_keywords, []).length,
        spamFilterEnabled: filterSettings.auto_archive_spam !== false,
        massEmailFilterEnabled: filterSettings.block_mass_emails !== false
      }
    });
    
  } catch (error) {
    console.error('Check action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Check failed',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to analyze hot leads
async function analyzeHotLead(body, subject, keywords) {
  const content = `${subject} ${body}`.toLowerCase();
  let score = 0;
  const matchedKeywords = [];
  
  // Parse keywords if it's a JSON string
  const hotLeadKeywords = tryParseJSON(keywords, ['urgent', 'asap', 'budget', 'ready']);
  
  // Check for hot lead keywords
  for (const keyword of hotLeadKeywords) {
    if (content.includes(keyword.toLowerCase())) {
      score += 25;
      matchedKeywords.push(keyword);
    }
  }
  
  // Check for buying signals
  const buyingSignals = [
    'ready to purchase',
    'looking to buy',
    'need a quote',
    'pricing',
    'how much',
    'interested in'
  ];
  
  for (const signal of buyingSignals) {
    if (content.includes(signal)) {
      score += 20;
    }
  }
  
  // Check for urgency
  if (content.includes('today') || content.includes('tomorrow') || content.includes('this week')) {
    score += 15;
  }
  
  return {
    isHotLead: score >= 40,
    score: Math.min(score, 100),
    reasoning: matchedKeywords.length > 0 
      ? `Matched keywords: ${matchedKeywords.join(', ')}`
      : 'Buying signals detected'
  };
}

// Helper function to update filter statistics
async function updateFilterStatistics(customerId, filterResults) {
  try {
    const filtered = filterResults.filter(r => r.action === 'filtered').length;
    const allowed = filterResults.filter(r => r.action === 'allowed').length;
    
    const updateQuery = `
      UPDATE email_settings
      SET emails_processed_today = COALESCE(emails_processed_today, 0) + $1,
          last_monitored = CURRENT_TIMESTAMP
      WHERE customer_id = $2
    `;
    
    await query(updateQuery, [filterResults.length, customerId]);
    
    console.log(`📊 Updated statistics: ${filtered} filtered, ${allowed} allowed`);
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Filtering API',
    description: 'Apply email filtering rules to Gmail messages',
    endpoints: {
      POST: {
        actions: ['filter', 'get-stats', 'test', 'check'],
        filter: 'Apply filtering to Gmail unread messages (requires emailAddress)',
        'get-stats': 'Get filtering statistics for the last 7 days',
        test: 'Test filtering with sample data (no Gmail required)',
        check: 'Test filtering on provided emails array (no Gmail required)'
      }
    },
    examples: {
      test: {
        action: 'test'
      },
      check: {
        action: 'check',
        emails: [
          {
            id: 'test1',
            from: 'sender@example.com',
            subject: 'Test Subject',
            body: 'Test body content'
          }
        ]
      },
      filter: {
        action: 'filter',
        emailAddress: 'user@gmail.com'
      }
    }
  });
}
