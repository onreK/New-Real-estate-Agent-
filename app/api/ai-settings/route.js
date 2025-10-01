// app/api/ai-settings/route.js - Production-ready for 100+ users
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Simple in-memory cache for better performance
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Import your existing database functions
let db = {};
try {
  const database = await import('../../../lib/database.js');
  db = database;
  console.log('✅ Database loaded for AI settings');
} catch (error) {
  console.log('⚠️ Database not available:', error.message);
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channel, settings } = await request.json();
    
    // Validate required fields
    if (!channel || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔧 Saving AI settings for channel: ${channel}`, settings);

    // Clear cache for this user
    const cacheKey = `${userId}_${channel}`;
    settingsCache.delete(cacheKey);

    // Map channel-specific settings to your existing database structure
    const aiConfigData = {
      personality: settings.responseTone?.toLowerCase() || 'professional',
      model: 'gpt-4o-mini', // Default model
      temperature: 0.7,
      maxTokens: settings.responseLength === 'Long' ? 500 : 
                 settings.responseLength === 'Medium' ? 300 : 150,
      systemPrompt: settings.customInstructions || '',
      knowledgeBase: settings.knowledgeBase || ''
    };

    // Save main AI configuration using your existing system
    if (db.saveAIConfig) {
      await db.saveAIConfig(userId, aiConfigData);
      console.log('✅ Saved AI config to database');
    }

    // Save channel-specific settings
    const channelKey = `ai_settings_${channel}_${userId}`;
    const channelData = {
      channel,
      userId,
      businessName: settings.businessName || '',
      industry: settings.industry || '',
      businessDescription: settings.businessDescription || '',
      responseTone: settings.responseTone || 'Professional',
      responseLength: settings.responseLength || 'Short',
      knowledgeBase: settings.knowledgeBase || '',
      customInstructions: settings.customInstructions || '',
      // Channel-specific features
      ...(channel === 'facebook' && {
        autoRespondMessages: settings.autoRespondMessages || false,
        autoRespondComments: settings.autoRespondComments || false
      }),
      ...(channel === 'instagram' && {
        autoRespondDMs: settings.autoRespondDMs || false,
        autoRespondComments: settings.autoRespondComments || false
      }),
      ...(channel === 'text' && {
        enableAutoResponses: settings.enableAutoResponses || false,
        hotLeadDetection: settings.hotLeadDetection || false,
        responseDelay: settings.responseDelay || ''
      }),
      ...(channel === 'chatbot' && {
        proactiveEngagement: settings.proactiveEngagement || false,
        collectContactInfo: settings.collectContactInfo || false
      }),
      updatedAt: new Date().toISOString()
    };

    // Store channel-specific settings
    if (db.storeChannelSettings) {
      await db.storeChannelSettings(channelKey, channelData);
    } else {
      // Fallback to in-memory storage if database not available
      global.aiChannelSettings = global.aiChannelSettings || {};
      global.aiChannelSettings[channelKey] = channelData;
    }

    // Update email settings if it's the email channel
    if (channel === 'email') {
      const emailSettingsData = {
        enable_ai_responses: true,
        tone: settings.responseTone?.toLowerCase(),
        expertise: settings.industry,
        business_name: settings.businessName,
        knowledge_base: settings.knowledgeBase,
        custom_instructions: settings.customInstructions,
        ai_system_prompt: settings.customInstructions,
        response_length: settings.responseLength?.toLowerCase()
      };

      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/email-settings/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify(emailSettingsData)
        });

        if (emailResponse.ok) {
          console.log('✅ Updated email AI settings');
        }
      } catch (emailError) {
        console.log('⚠️ Could not update email settings:', emailError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${channel} settings saved successfully`,
      settings: channelData 
    });

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');

    if (channel) {
      // Check cache first
      const cacheKey = `${userId}_${channel}`;
      const cached = settingsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }

      // Get specific channel settings
      const channelKey = `ai_settings_${channel}_${userId}`;
      
      let channelSettings = null;
      if (db.getChannelSettings) {
        channelSettings = await db.getChannelSettings(channelKey);
      } else if (global.aiChannelSettings) {
        channelSettings = global.aiChannelSettings[channelKey];
      }

      // Also get the main AI config
      let aiConfig = null;
      if (db.getAIConfig) {
        aiConfig = await db.getAIConfig(userId);
      }

      const responseData = { 
        success: true, 
        channel,
        settings: channelSettings,
        aiConfig
      };

      // Cache the response
      settingsCache.set(cacheKey, {
        timestamp: Date.now(),
        data: responseData
      });

      return NextResponse.json(responseData);
    } else {
      // Get all channel settings for this user
      const allSettings = {};
      const channels = ['email', 'facebook', 'instagram', 'text', 'chatbot'];
      
      // Check if we have a cached version of all settings
      const allCacheKey = `${userId}_all`;
      const cachedAll = settingsCache.get(allCacheKey);
      if (cachedAll && Date.now() - cachedAll.timestamp < CACHE_TTL) {
        return NextResponse.json(cachedAll.data);
      }
      
      for (const ch of channels) {
        const channelKey = `ai_settings_${ch}_${userId}`;
        if (db.getChannelSettings) {
          allSettings[ch] = await db.getChannelSettings(channelKey);
        } else if (global.aiChannelSettings) {
          allSettings[ch] = global.aiChannelSettings[channelKey];
        }
      }

      // Get main AI config
      let aiConfig = null;
      if (db.getAIConfig) {
        aiConfig = await db.getAIConfig(userId);
      }

      const responseData = { 
        success: true, 
        settings: allSettings,
        aiConfig
      };

      // Cache the response
      settingsCache.set(allCacheKey, {
        timestamp: Date.now(),
        data: responseData
      });

      return NextResponse.json(responseData);
    }
  } catch (error) {
    console.error('❌ Error fetching AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    );
  }
}
