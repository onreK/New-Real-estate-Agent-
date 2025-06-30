'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, ArrowLeft, Mail, Sparkles, Eye } from 'lucide-react';

export default function EmailTemplatesManager() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subject: '',
    content: '',
    variables: '[]'
  });

  const categories = [
    { value: 'first_contact', label: '👋 First Contact', description: 'Welcome messages for new leads' },
    { value: 'follow_up', label: '📞 Follow Up', description: 'Follow-up sequences' },
    { value: 'appointment', label: '📅 Appointment', description: 'Scheduling and confirmations' },
    { value: 'pricing', label: '💰 Pricing', description: 'Pricing and budget discussions' },
    { value: 'hot_lead', label: '🔥 Hot Lead Response', description: 'Urgent customer responses' },
    { value: 'thank_you', label: '🙏 Thank You', description: 'Thank you messages' },
    { value: 'custom', label: '📝 Custom', description: 'Custom templates' }
  ];

  const defaultTemplates = [
    {
      name: 'Welcome New Lead',
      category: 'first_contact',
      subject: 'Welcome to {{business_name}} - We are Here to Help!',
      content: `Hi {{customer_name}},

Thank you for reaching out to {{business_name}}! I am {{agent_name}}, and I am excited to help you with your inquiry.

I received your message and wanted to personally reach out to let you know that I will be handling your request. Based on what you have shared, I believe I can provide exactly what you are looking for.

Here is what happens next:
- I will review your requirements in detail
- I will prepare some personalized recommendations  
- I will reach out within 24 hours with next steps

If you have any urgent questions, feel free to reply to this email or call me directly at {{phone_number}}.

Looking forward to working with you!

Best regards,
{{agent_name}}
{{business_name}}
{{email_signature}}`,
      variables: ['customer_name', 'business_name', 'agent_name', 'phone_number', 'email_signature']
    },
    {
      name: 'Hot Lead Response',
      category: 'hot_lead',
      subject: 'URGENT: Your {{business_name}} Inquiry - Let us Connect Today!',
      content: `Hi {{customer_name}},

I just received your inquiry and I am reaching out immediately because this looks like an EXCELLENT match for what we offer at {{business_name}}.

Based on your message, I can already see several ways we can help you achieve your goals quickly and efficiently.

Here is what I would like to do:
- Schedule a quick 15-minute call today or tomorrow
- Show you exactly how we can solve your specific needs
- Provide you with a customized solution proposal

I have availability today at:
- {{time_slot_1}}
- {{time_slot_2}}
- {{time_slot_3}}

Or if you prefer, I can call you right now! Just reply with your best number and a good time.

This opportunity will not last long, so let us connect while everything is fresh.

Ready to get started?

{{agent_name}}
{{business_name}}
{{phone_number}}`,
      variables: ['customer_name', 'business_name', 'agent_name', 'phone_number', 'time_slot_1', 'time_slot_2', 'time_slot_3']
    },
    {
      name: 'Follow Up Check-in',
      category: 'follow_up',
      subject: 'Following up on your {{business_name}} inquiry',
      content: `Hi {{customer_name}},

I wanted to follow up on the information I sent about {{business_name}} services. 

Have you had a chance to review everything? I am here to answer any questions you might have.

Sometimes people like to discuss:
- Pricing and payment options
- Timeline for getting started
- Specific features or customizations
- How our solution compares to others

I am available for a quick call this week if that would be helpful. What day works best for you?

Looking forward to hearing from you!

{{agent_name}}
{{business_name}}`,
      variables: ['customer_name', 'business_name', 'agent_name']
    },
    {
      name: 'Appointment Confirmation',
      category: 'appointment',
      subject: 'Confirmed: Your appointment with {{business_name}} on {{appointment_date}}',
      content: `Hi {{customer_name}},

This confirms your appointment with {{business_name}}:

Date: {{appointment_date}}
Time: {{appointment_time}}
Location: {{meeting_location}}
With: {{agent_name}}

What to expect:
- We will review your specific needs
- I will show you how our solutions work
- We will discuss pricing and next steps
- Duration: approximately {{duration}} minutes

To prepare for our meeting, please bring:
- Any relevant documents or information
- List of your key requirements
- Any questions you would like to discuss

If you need to reschedule, please let me know at least 24 hours in advance.

Looking forward to meeting you!

{{agent_name}}
{{business_name}}
{{phone_number}}`,
      variables: ['customer_name', 'business_name', 'appointment_date', 'appointment_time', 'meeting_location', 'agent_name', 'duration', 'phone_number']
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/customer/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const installDefaultTemplates = async () => {
    try {
      setLoading(true);
      for (const template of defaultTemplates) {
        await fetch('/api/customer/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...template,
            variables: JSON.stringify(template.variables)
          })
        });
      }
      await loadTemplates();
    } catch (error) {
      console.error('Error installing templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const method = isCreating ? 'POST' : 'PUT';
      const url = isCreating 
        ? '/api/customer/email-templates'
        : `/api/customer/email-templates?id=${selectedTemplate.id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadTemplates();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedTemplate(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/customer/email-templates?id=${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTemplates();
        if (selectedTemplate && selectedTemplate.id === templateId) {
          setSelectedTemplate(null);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      subject: '',
      content: '',
      variables: '[]'
    });
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(true);
    setSelectedTemplate(null);
  };

  const startEditing = (template) => {
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      content: template.content,
      variables: template.variables || '[]'
    });
    setSelectedTemplate(template);
    setIsEditing(true);
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedTemplate(null);
    resetForm();
  };

  const renderPreview = () => {
    if (!formData.content) return 'No content to preview';
    
    let preview = formData.content;
    const commonVars = {
      'customer_name': 'John Smith',
      'business_name': 'IntelliHub AI',
      'agent_name': 'Sarah Johnson',
      'phone_number': '(555) 123-4567',
      'appointment_date': 'Friday, July 5th',
      'appointment_time': '2:00 PM',
      'email_signature': 'Sarah Johnson - Senior AI Consultant - IntelliHub AI'
    };

    Object.entries(commonVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/email')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email Templates Manager
          </h1>
          <p className="text-gray-600">Create and manage your AI email templates</p>
        </div>
        <Button onClick={startCreating} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Get Started with Default Templates
            </CardTitle>
            <CardDescription>
              Install 4 professional email templates to get started immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={installDefaultTemplates} className="bg-blue-600 hover:bg-blue-700">
              Install Default Templates
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Templates ({templates.length})</h2>
          
          {categories.map(category => {
            const categoryTemplates = templates.filter(t => t.category === category.value);
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category.value} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{category.label}</h3>
                  <Badge variant="outline">{categoryTemplates.length}</Badge>
                </div>
                
                {categoryTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(template);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}

          {templates.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No templates yet. Create your first template!</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>{isCreating ? 'Create New Template' : 'Edit Template'}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={previewMode ? 'default' : 'outline'}
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!previewMode ? (
                  <>
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter template name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter email subject line"
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Email Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter email content. Use {{variable_name}} for dynamic content."
                        rows={12}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {isCreating ? 'Create Template' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Subject Preview:</Label>
                      <div className="p-3 bg-gray-50 rounded border">
                        {formData.subject || 'No subject'}
                      </div>
                    </div>
                    <div>
                      <Label>Content Preview:</Label>
                      <div className="p-4 bg-gray-50 rounded border max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {renderPreview()}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedTemplate.name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline">
                    {categories.find(c => c.value === selectedTemplate.category)?.label || selectedTemplate.category}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Subject:</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {selectedTemplate.subject}
                  </div>
                </div>
                <div>
                  <Label>Content:</Label>
                  <div className="p-4 bg-gray-50 rounded border max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => startEditing(selectedTemplate)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Template
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDelete(selectedTemplate.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Select a template to view or edit</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
