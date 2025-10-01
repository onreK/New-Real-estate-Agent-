// Replace just the AISettingsSection component in your dashboard/page.js with this:

const AISettingsSection = () => {
  const [settingsData, setSettingsData] = useState({
    email: {
      businessName: '',
      industry: '',
      businessDescription: '',
      responseTone: 'Professional',
      responseLength: 'Short',
      knowledgeBase: '',
      customInstructions: ''
    },
    facebook: {
      businessName: '',
      industry: '',
      businessDescription: '',
      responseTone: 'Casual',  // Default to casual for Facebook
      responseLength: 'Short',
      knowledgeBase: '',
      customInstructions: '',
      autoRespondMessages: false,
      autoRespondComments: false
    },
    instagram: {
      businessName: '',
      industry: '',
      businessDescription: '',
      responseTone: 'Friendly',  // Default to friendly for Instagram
      responseLength: 'Short',
      knowledgeBase: '',
      customInstructions: '',
      autoRespondDMs: false,
      autoRespondComments: false
    },
    text: {
      businessName: '',
      industry: '',
      businessDescription: '',
      responseTone: 'Professional',
      responseLength: 'Short',
      knowledgeBase: '',
      customInstructions: '',
      enableAutoResponses: false,
      hotLeadDetection: false,
      responseDelay: ''
    },
    chatbot: {
      businessName: '',
      industry: '',
      businessDescription: '',
      responseTone: 'Friendly',
      responseLength: 'Medium',
      knowledgeBase: '',
      customInstructions: '',
      proactiveEngagement: false,
      collectContactInfo: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load existing settings when component mounts
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoadingSettings(true);
      
      // First, try to load from the centralized AI settings endpoint
      const response = await fetch('/api/ai-settings');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.settings) {
          // Load the saved channel-specific settings
          const updatedSettings = { ...settingsData };
          
          Object.keys(data.settings).forEach(channel => {
            if (data.settings[channel] && updatedSettings[channel]) {
              updatedSettings[channel] = {
                ...updatedSettings[channel],
                ...data.settings[channel]
              };
            }
          });
          
          setSettingsData(updatedSettings);
          console.log('✅ Loaded channel-specific AI settings');
        }
      } else {
        // Fallback: Load from customer AI settings for email channel
        const fallbackResponse = await fetch('/api/customer/ai-settings');
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          
          if (data.settings) {
            // Only update email channel with fallback data
            setSettingsData(prev => ({
              ...prev,
              email: {
                ...prev.email,
                businessName: data.customer?.business_name || '',
                industry: data.settings.expertise || '',
                businessDescription: data.settings.specialties || '',
                knowledgeBase: data.settings.knowledge_base || '',
                customInstructions: data.settings.custom_instructions || data.settings.ai_system_prompt || '',
                responseTone: (data.settings.tone || 'professional').charAt(0).toUpperCase() + (data.settings.tone || 'professional').slice(1).toLowerCase(),
                responseLength: (data.settings.response_length || 'medium').charAt(0).toUpperCase() + (data.settings.response_length || 'medium').slice(1).toLowerCase()
              }
            }));
            console.log('✅ Loaded email settings from fallback');
          }
        }
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (channel) => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      // Save to the centralized AI settings endpoint with channel-specific data
      const response = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel,
          settings: settingsData[channel]
        })
      });

      if (response.ok) {
        setSaveMessage(`${channel.charAt(0).toUpperCase() + channel.slice(1)} settings saved successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
        
        // Also save core business info to email settings for compatibility
        if (channel === 'email') {
          try {
            await fetch('/api/email-settings/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                business_name: settingsData.email.businessName,
                expertise: settingsData.email.industry,
                specialties: settingsData.email.businessDescription,
                knowledge_base: settingsData.email.knowledgeBase,
                custom_instructions: settingsData.email.customInstructions,
                ai_system_prompt: settingsData.email.customInstructions,
                tone: settingsData.email.responseTone.toLowerCase(),
                response_length: settingsData.email.responseLength.toLowerCase()
              })
            });
            console.log('✅ Also saved email settings to email-settings endpoint');
          } catch (emailError) {
            console.log('Email settings backup save failed:', emailError);
          }
        }
      } else {
        setSaveMessage('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (channel, field, value) => {
    setSettingsData(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }));
  };

  if (loadingSettings) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-white">Loading AI Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <Cpu className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">AI Settings</h3>
          <p className="text-sm text-gray-300">Configure unique AI behavior for each communication channel</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2">
        {aiSettingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAITab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeAITab === tab.id
                ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Show current channel's tone as a badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-gray-400">Current tone for {activeAITab}:</span>
        <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
          {settingsData[activeAITab]?.responseTone || 'Not set'}
        </span>
      </div>

      {/* Tab content - Include all channel tabs here */}
      <div className="space-y-6">
        {/* For brevity, I'm showing the structure. You'll need to include all channels */}
        {Object.keys(settingsData).map(channelKey => (
          activeAITab === channelKey && (
            <div key={channelKey} className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <aiSettingsTabs.find(t => t.id === channelKey)?.icon className="w-5 h-5 text-purple-400" />
                  Business Profile
                </h4>
                <p className="text-sm text-gray-300 mb-4">Tell the AI about your business</p>
                <div className="space-y-3">
                  <input 
                    placeholder="Business Name"
                    value={settingsData[channelKey].businessName}
                    onChange={(e) => updateSettings(channelKey, 'businessName', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  />
                  <input 
                    placeholder="Industry"
                    value={settingsData[channelKey].industry}
                    onChange={(e) => updateSettings(channelKey, 'industry', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  />
                  <textarea 
                    placeholder="Business description..."
                    value={settingsData[channelKey].businessDescription}
                    onChange={(e) => updateSettings(channelKey, 'businessDescription', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Communication Settings for {channelKey.charAt(0).toUpperCase() + channelKey.slice(1)}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response tone</span>
                    <select 
                      value={settingsData[channelKey].responseTone}
                      onChange={(e) => updateSettings(channelKey, 'responseTone', e.target.value)}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option>Professional</option>
                      <option>Casual</option>
                      <option>Formal</option>
                      <option>Friendly</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Response length</span>
                    <select 
                      value={settingsData[channelKey].responseLength}
                      onChange={(e) => updateSettings(channelKey, 'responseLength', e.target.value)}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option>Short</option>
                      <option>Medium</option>
                      <option>Long</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  {channelKey.charAt(0).toUpperCase() + channelKey.slice(1)}-Specific Knowledge Base
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  Add channel-specific information (e.g., more casual FAQs for social media)
                </p>
                <textarea 
                  placeholder={`Enter ${channelKey}-specific information...`}
                  value={settingsData[channelKey].knowledgeBase}
                  onChange={(e) => updateSettings(channelKey, 'knowledgeBase', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-32 resize-none"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Custom AI Instructions for {channelKey.charAt(0).toUpperCase() + channelKey.slice(1)}
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  {channelKey === 'email' && "Professional email responses with formal greetings"}
                  {channelKey === 'facebook' && "Friendly, engaging responses with emojis okay 😊"}
                  {channelKey === 'instagram' && "Trendy, visual-focused responses with hashtags"}
                  {channelKey === 'text' && "Brief, to-the-point SMS responses"}
                  {channelKey === 'chatbot' && "Interactive, helpful website chat responses"}
                </p>
                <textarea 
                  placeholder={`Enter ${channelKey}-specific AI behavior instructions...`}
                  value={settingsData[channelKey].customInstructions}
                  onChange={(e) => updateSettings(channelKey, 'customInstructions', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 h-32 resize-none"
                />
              </div>

              {/* Channel-specific toggles */}
              {channelKey === 'facebook' && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-3">Facebook Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Auto-respond to messages</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settingsData.facebook.autoRespondMessages}
                          onChange={(e) => updateSettings('facebook', 'autoRespondMessages', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Auto-respond to comments</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settingsData.facebook.autoRespondComments}
                          onChange={(e) => updateSettings('facebook', 'autoRespondComments', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Add similar channel-specific configuration for other channels */}

              <button 
                onClick={() => handleSaveSettings(channelKey)}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : `Save ${channelKey.charAt(0).toUpperCase() + channelKey.slice(1)} Settings`}
              </button>
              
              {saveMessage && activeAITab === channelKey && (
                <div className={`mt-2 p-3 rounded-lg text-center ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
};
