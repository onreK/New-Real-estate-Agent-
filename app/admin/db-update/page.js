'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDbUpdate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const addKnowledgeBaseColumn = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/add-knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add Knowledge Base Column</CardTitle>
          <CardDescription>
            Run this once to add the knowledge_base column to your email_settings table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={addKnowledgeBaseColumn}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Adding Column...' : 'Add Knowledge Base Column'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
