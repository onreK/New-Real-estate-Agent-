'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowLeft, Mail, Save } from 'lucide-react';

export default function EmailTemplatesManager() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'custom',
    subject: '',
    content: ''
  });

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

  const handleSave = async () => {
    try {
      const response = await fetch('/api/customer/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          subject: formData.subject,
          content: formData.content,
          variables: '[]'
        })
      });

      if (response.ok) {
        await loadTemplates();
        setIsEditing(false);
        setFormData({ name: '', category: 'custom', subject: '', content: '' });
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const startCreating = () => {
    setIsEditing(true);
    setFormData({ name: '', category: 'custom', subject: '', content: '' });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData({ name: '', category: 'custom', subject: '', content: '' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

      {isEditing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <Label htmlFor="content">Email Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Enter email content..."
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!formData.name || !formData.subject || !formData.content}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map(template => (
                <div key={template.id} className="p-3 border rounded">
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.subject}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No templates yet. Create your first template!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
