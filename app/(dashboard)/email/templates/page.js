'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function EmailTemplates() {
  const { user } = useUser();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'first_contact',
    subject: '',
    content: '',
    variables: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const templateCategories = [
    { value: 'first_contact', label: 'First Contact', icon: '👋' },
    { value: 'property_inquiry', label: 'Property Inquiry', icon: '🏠' },
    { value: 'pricing_budget', label: 'Pricing & Budget', icon: '💰' },
    { value: 'viewing_scheduling', label: 'Viewing & Scheduling', icon: '📅' },
    { value: 'follow_up', label: 'Follow Up', icon: '📞' },
    { value: 'hot_lead_response', label: 'Hot Lead Response', icon: '🔥' },
    { value: 'custom', label: 'Custom', icon: '📝' }
  ];

  const defaultTemplates = [
    {
      name: 'First Contact Welcome',
      category: 'first_contact',
      subject: 'Thank you for your interest - Let\'s find your perfect home!',
      content: `Thank you for contacting {{business_name}}! I'm excited to help you with your real estate needs.

Based on your inquiry about {{inquiry_type}}, I'd be delighted to assist you in finding the perfect property. With {{years_experience}} years of experience in {{area_expertise}}, I'm confident we can find exactly what you're looking for.

{{#if_urgent}}
I understand this is urgent for you, so I'll prioritize your search and get back to you with options within the next few hours.
{{/if_urgent}}

To get started, I'd love to learn more about:
- Your preferred location and neighborhood
- Budget range you're comfortable with  
- Timeline for your move
- Any specific features that are must-haves

{{#if_availability}}
I have availability this week for property viewings:
- {{availability_times}}
{{/if_availability}}

Looking forward to helping you find your dream home!

Best regards,
{{agent_name}}
{{business_name}}
{{contact_info}}`,
      variables: ['business_name', 'inquiry_type', 'years_experience', 'area_expertise', 'agent_name', 'contact_info', 'availability_times']
    },
    {
      name: 'Property Details Response',
      category: 'property_inquiry',
      subject: 'Re: {{property_address}} - Property Details & Viewing',
      content: `Thank you for your interest in {{property_address}}! I'd be happy to provide you with detailed information about this property.

Here are the key details:
- Price: {{property_price}}
- Bedrooms: {{bedrooms}} | Bathrooms: {{bathrooms}}
- Square Footage: {{square_feet}}
- Lot Size: {{lot_size}}
- Year Built: {{year_built}}

{{property_highlights}}

This property is in a fantastic location with easy access to {{local_amenities}}. The neighborhood offers {{neighborhood_features}}.

{{#if_schools}}
For families, the local schools include:
{{school_information}}
{{/if_schools}}

I'd love to arrange a private showing for you. When would work best for your schedule?

{{viewing_availability}}

I'll also prepare a detailed market analysis and comparable sales for our meeting.

Best regards,
{{agent_name}}
{{business_name}}`,
      variables: ['property_address', 'property_price', 'bedrooms', 'bathrooms', 'square_feet', 'lot_size', 'year_built', 'property_highlights', 'local_amenities', 'neighborhood_features', 'school_information', 'viewing_availability', 'agent_name', 'business_name']
    },
    {
      name: 'Budget Discussion',
      category: 'pricing_budget',
      subject: 'Budget Planning & Available Options',
      content: `Thank you for sharing your budget range of {{budget_range}}. I'm excited to show you what's available in this price range!

Based on current market conditions in {{target_area}}, here's what you can expect:

{{market_analysis}}

I have several excellent properties that fit your criteria:
{{available_properties}}

{{#if_financing}}
Regarding financing, I work with trusted mortgage professionals who can help you:
- Get pre-approved quickly
- Explore different loan options
- Calculate accurate monthly payments
- Navigate first-time buyer programs (if applicable)
{{/if_financing}}

{{#if_negotiation}}
In this market, I recommend being prepared to:
{{negotiation_strategy}}
{{/if_negotiation}}

Would you like to schedule a time to review these properties together? I can arrange back-to-back viewings to make the most of your time.

Best regards,
{{agent_name}}
{{business_name}}`,
      variables: ['budget_range', 'target_area', 'market_analysis', 'available_properties', 'negotiation_strategy', 'agent_name', 'business_name']
    },
    {
      name: 'Hot Lead Urgent Response',
      category: 'hot_lead_response',
      subject: 'URGENT: {{inquiry_subject}} - Immediate Response',
      content: `I received your urgent message and wanted to respond immediately!

{{urgent_acknowledgment}}

I understand you need {{urgent_requirement}} and I'm here to help make this happen quickly.

IMMEDIATE NEXT STEPS:
1. {{immediate_action_1}}
2. {{immediate_action_2}}  
3. {{immediate_action_3}}

{{#if_same_day}}
I can arrange same-day viewings if needed. My availability today includes:
{{today_availability}}
{{/if_same_day}}

{{#if_financing_urgent}}
For quick financing, I can connect you with lenders who specialize in fast approvals and can provide pre-approval within 24 hours.
{{/if_financing_urgent}}

I'm personally handling your request and you can reach me directly at:
- Phone: {{direct_phone}}
- Text: {{direct_phone}}  
- Email: {{direct_email}}

Let's get this moving for you right away!

{{agent_name}}
{{business_name}}

P.S. I'm standing by for your response and ready to take action immediately.`,
      variables: ['inquiry_subject', 'urgent_acknowledgment', 'urgent_requirement', 'immediate_action_1', 'immediate_action_2', 'immediate_action_3', 'today_availability', 'direct_phone', 'direct_email', 'agent_name', 'business_name']
    }
  ];

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/customer/email-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        console.error('Failed to load templates:', data.error);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const templateData = selectedTemplate ? selectedTemplate : newTemplate;
      
      const response = await fetch('/api/customer/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTemplates();
        setIsEditing(false);
        setSelectedTemplate(null);
        setNewTemplate({
          name: '',
          category: 'first_contact',
          subject: '',
          content: '',
          variables: []
        });
        alert('Template saved successfully!');
      } else {
        alert('Error saving template: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch('/api/customer/email-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTemplates();
        setSelectedTemplate(null);
        alert('Template deleted successfully!');
      } else {
        alert('Error deleting template: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  const installDefaultTemplates = async () => {
    setSaving(true);
    try {
      for (const template of defaultTemplates) {
        await fetch('/api/customer/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template)
        });
      }
      
      await loadTemplates();
      alert('Default templates installed successfully!');
    } catch (error) {
      console.error('Error installing default templates:', error);
      alert('Error installing default templates');
    } finally {
      setSaving(false);
    }
  };

  const editTemplate = (template) => {
    setSelectedTemplate({ ...template });
    setIsEditing(true);
  };

  const createNewTemplate = () => {
    setSelectedTemplate(null);
    setNewTemplate({
      name: '',
      category: 'first_contact',
      subject: '',
      content: '',
      variables: []
    });
    setIsEditing(true);
  };

  const getCurrentTemplate = () => {
    return selectedTemplate || newTemplate;
  };

  const updateCurrentTemplate = (field, value) => {
    if (selectedTemplate) {
      setSelectedTemplate({ ...selectedTemplate, [field]: value });
    } else {
      setNewTemplate({ ...newTemplate, [field]: value });
    }
  };

  const getCategoryIcon = (category) => {
    const cat = templateCategories.find(c => c.value === category);
    return cat ? cat.icon : '📝';
  };

  const getCategoryLabel = (category) => {
    const cat = templateCategories.find(c => c.value === category);
    return cat ? cat.label : 'Custom';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📝 Email Templates</h1>
              <p className="text-sm text-gray-600">Customize your AI email responses</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={createNewTemplate}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ➕ New Template
              </button>
              {templates.length === 0 && (
                <button
                  onClick={installDefaultTemplates}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Installing...' : '🚀 Install Default Templates'}
                </button>
              )}
              <Link 
                href="/email"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 transition-colors"
              >
                ← Back to Email
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isEditing ? (
          // Templates List View
          <div>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Email Templates Yet</h3>
                <p className="text-gray-600 mb-6">
                  Create custom email templates to personalize your AI responses
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={installDefaultTemplates}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Installing...' : '🚀 Install Default Templates'}
                  </button>
                  <button
                    onClick={createNewTemplate}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    ➕ Create Custom Template
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getCategoryIcon(template.category)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500">{getCategoryLabel(template.category)}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editTemplate(template)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                      <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
                      <p className="text-sm text-gray-600 line-clamp-3">{template.content.substring(0, 150)}...</p>
                    </div>
                    
                    {template.variables && template.variables.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map((variable) => (
                            <span key={variable} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {variable}
                            </span>
                          ))}
                          {template.variables.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{template.variables.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Template Editor View
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={getCurrentTemplate().name}
                    onChange={(e) => updateCurrentTemplate('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., First Contact Welcome"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={getCurrentTemplate().category}
                    onChange={(e) => updateCurrentTemplate('category', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {templateCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={getCurrentTemplate().subject}
                    onChange={(e) => updateCurrentTemplate('subject', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Thank you for your interest - Let's find your perfect home!"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Content
                  </label>
                  <textarea
                    value={getCurrentTemplate().content}
                    onChange={(e) => updateCurrentTemplate('content', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={12}
                    placeholder="Write your email template content here. Use {{variable_name}} for dynamic content."
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Use {{'{'}variable_name{'}'}} for dynamic content like {{'{'}business_name{'}'}} or {{'{'}agent_name{'}'}}.
                  </p>
                </div>

                {/* Variables Help */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Available Variables:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {[
                      'business_name', 'agent_name', 'contact_info', 'inquiry_type',
                      'property_address', 'property_price', 'budget_range', 'target_area',
                      'bedrooms', 'bathrooms', 'availability_times', 'urgent_requirement'
                    ].map((variable) => (
                      <code key={variable} className="bg-white px-2 py-1 rounded text-blue-700">
                        {'{{'}{variable}{'}}'}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTemplate}
                    disabled={saving || !getCurrentTemplate().name || !getCurrentTemplate().content}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
