// app/api/ai-settings/route.js - Centralized AI Settings Management
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
    console.log(`🔧 Saving AI settings for channel: ${channel}`, settings);

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
      businessName: settings.businessName,
      industry: settings.industry,
      businessDescription: settings.businessDescription,
      responseTone: settings.responseTone,
      responseLength: settings.responseLength,
      knowledgeBase: settings.knowledgeBase,
      customInstructions: settings.customInstructions,
      // Channel-specific features
      ...(channel === 'facebook' && {
        autoRespondMessages: settings.autoRespondMessages,
        autoRespondComments: settings.autoRespondComments
      }),
      ...(channel === 'instagram' && {
        autoRespondDMs: settings.autoRespondDMs,
        autoRespondComments: settings.autoRespondComments
      }),
      ...(channel === 'text' && {
        enableAutoResponses: settings.enableAutoResponses,
        hotLeadDetection: settings.hotLeadDetection,
        responseDelay: settings.responseDelay
      }),
      ...(channel === 'chatbot' && {
        proactiveEngagement: settings.proactiveEngagement,
        collectContactInfo: settings.collectContactInfo
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

    // Update the centralized AI service configuration
    // This ensures all channels use the same AI brain
    if (channel === 'email') {
      // For email, also update the email-specific settings
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

      // Save using your existing email settings endpoint
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
      message: `${channel} AI settings saved successfully`,
      settings: channelData 
    });

  } catch (error) {
    console.error('❌ Error saving AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to save AI settings', details: error.message },
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

      return NextResponse.json({ 
        success: true, 
        channel,
        settings: channelSettings,
        aiConfig
      });
    } else {
      // Get all channel settings for this user
      const allSettings = {};
      const channels = ['email', 'facebook', 'instagram', 'text', 'chatbot'];
      
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

      return NextResponse.json({ 
        success: true, 
        settings: allSettings,
        aiConfig
      });
    }
  } catch (error) {
    console.error('❌ Error fetching AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI settings', details: error.message },
      { status: 500 }
    );
  }
}
