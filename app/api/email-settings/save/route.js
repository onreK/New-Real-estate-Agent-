// app/api/email-settings/save/route.js
// This endpoint saves email settings with proper JSONB formatting

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';

export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const settings = await request.json();
    console.log('📝 Received settings to save:', settings);
    
    // Get customer ID
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );
    
    if (!customerResult.rows[0]) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Process arrays - ensure they're properly formatted
    const processArray = (field) => {
      if (!field) return [];
      if (typeof field === 'string') {
        // Split by comma or newline and clean up
        return field.split(/[,\n]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
      if (Array.isArray(field)) {
        return field.filter(item => item && item.length > 0);
      }
      return [];
    };
    
    // Process the blacklist, whitelist, and priority keywords
    const blacklistEmails = processArray(settings.blacklist_emails);
    const whitelistEmails = processArray(settings.whitelist_emails);
    const priorityKeywords = processArray(settings.priority_keywords);
    
    console.log('📋 Processed arrays:', {
      blacklist: blacklistEmails,
      whitelist: whitelistEmails,
      priority: priorityKeywords
    });
    
    // Check if settings exist
    const existingSettings = await query(
      'SELECT id FROM email_settings WHERE customer_id = $1',
      [customerId]
    );
    
    let result;
    
    if (existingSettings.rows.length > 0) {
      // Update existing settings
      result = await query(`
        UPDATE email_settings 
        SET 
          blacklist_emails = $1::jsonb,
          whitelist_emails = $2::jsonb,
          priority_keywords = $3::jsonb,
          auto_archive_spam = $4,
          block_mass_emails = $5,
          personal_only = $6,
          skip_auto_generated = $7,
          enable_ai_responses = $8,
          knowledge_base = $9,
          custom_instructions = $10,
          tone = $11,
          expertise = $12,
          ai_temperature = $13,
          ai_max_tokens = $14,
          response_length = $15,
          ai_model = $16,
          updated_at = NOW()
        WHERE customer_id = $17
        RETURNING *
      `, [
        JSON.stringify(blacklistEmails),  // Convert array to JSON string for JSONB
        JSON.stringify(whitelistEmails),
        JSON.stringify(priorityKeywords),
        settings.auto_archive_spam !== false,
        settings.block_mass_emails !== false,
        settings.personal_only || false,
        settings.skip_auto_generated !== false,
        settings.enable_ai_responses !== false,
        settings.knowledge_base || '',
        settings.custom_instructions || settings.ai_system_prompt || '',
        settings.tone || 'professional',
        settings.expertise || '',
        parseFloat(settings.ai_temperature || 0.7),
        parseInt(settings.ai_max_tokens || 500),
        settings.response_length || 'medium',
        settings.ai_model || 'gpt-4o-mini',
        customerId
      ]);
    } else {
      // Insert new settings
      result = await query(`
        INSERT INTO email_settings (
          customer_id,
          blacklist_emails,
          whitelist_emails,
          priority_keywords,
          auto_archive_spam,
          block_mass_emails,
          personal_only,
          skip_auto_generated,
          enable_ai_responses,
          knowledge_base,
          custom_instructions,
          tone,
          expertise,
          ai_temperature,
          ai_max_tokens,
          response_length,
          ai_model,
          created_at,
          updated_at
        ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *
      `, [
        customerId,
        JSON.stringify(blacklistEmails),
        JSON.stringify(whitelistEmails),
        JSON.stringify(priorityKeywords),
        settings.auto_archive_spam !== false,
        settings.block_mass_emails !== false,
        settings.personal_only || false,
        settings.skip_auto_generated !== false,
        settings.enable_ai_responses !== false,
        settings.knowledge_base || '',
        settings.custom_instructions || settings.ai_system_prompt || '',
        settings.tone || 'professional',
        settings.expertise || '',
        parseFloat(settings.ai_temperature || 0.7),
        parseInt(settings.ai_max_tokens || 500),
        settings.response_length || 'medium',
        settings.ai_model || 'gpt-4o-mini'
      ]);
    }
    
    console.log('✅ Settings saved successfully');
    console.log('📊 Saved data:', {
      blacklist_count: blacklistEmails.length,
      whitelist_count: whitelistEmails.length,
      priority_count: priorityKeywords.length
    });
    
    // Return the saved settings
    return NextResponse.json({
      success: true,
      message: 'Email settings saved successfully',
      settings: result.rows[0],
      processed: {
        blacklist_emails: blacklistEmails,
        whitelist_emails: whitelistEmails,
        priority_keywords: priorityKeywords
      }
    });
    
  } catch (error) {
    console.error('❌ Error saving email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to save settings',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get customer ID
    const customerResult = await query(
      'SELECT id FROM customers WHERE clerk_user_id = $1',
      [userId]
    );
    
    if (!customerResult.rows[0]) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Get settings
    const settingsResult = await query(
      'SELECT * FROM email_settings WHERE customer_id = $1',
      [customerId]
    );
    
    if (settingsResult.rows.length === 0) {
      // Return default settings
      return NextResponse.json({
        success: true,
        settings: {
          blacklist_emails: [],
          whitelist_emails: [],
          priority_keywords: [],
          auto_archive_spam: true,
          block_mass_emails: true,
          personal_only: false,
          skip_auto_generated: true,
          enable_ai_responses: true,
          knowledge_base: '',
          custom_instructions: '',
          tone: 'professional',
          expertise: '',
          ai_temperature: 0.7,
          ai_max_tokens: 500,
          response_length: 'medium',
          ai_model: 'gpt-4o-mini'
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      settings: settingsResult.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error loading email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to load settings',
      details: error.message 
    }, { status: 500 });
  }
}
