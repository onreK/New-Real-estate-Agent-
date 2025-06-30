import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

// In-memory storage for templates (replace with database later)
let templatesStorage = new Map();

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    console.log('📧 Email templates GET request for user:', userId);

    // Get user's templates from memory storage
    const userTemplates = templatesStorage.get(userId) || [];

    if (templateId) {
      const template = userTemplates.find(t => t.id === templateId);
      
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ template });
    } else {
      // Return all templates for user
      const sortedTemplates = userTemplates.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({ templates: sortedTemplates });
    }
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category, subject, content, variables } = await request.json();

    if (!name || !category || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📧 Creating email template for user:', userId);

    // Get user's templates from memory storage
    const userTemplates = templatesStorage.get(userId) || [];

    // Create new template
    const newTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name,
      category,
      subject,
      content,
      variables: variables || '[]',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to user's templates
    userTemplates.push(newTemplate);
    templatesStorage.set(userId, userTemplates);

    console.log('✅ Template created successfully:', newTemplate.id);

    return NextResponse.json({ 
      message: 'Template created successfully',
      template: newTemplate
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const { name, category, subject, content, variables } = await request.json();

    if (!name || !category || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📧 Updating email template:', templateId);

    // Get user's templates from memory storage
    const userTemplates = templatesStorage.get(userId) || [];
    const templateIndex = userTemplates.findIndex(t => t.id === templateId);

    if (templateIndex === -1) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    // Update template
    const updatedTemplate = {
      ...userTemplates[templateIndex],
      name,
      category,
      subject,
      content,
      variables: variables || '[]',
      updated_at: new Date().toISOString()
    };

    userTemplates[templateIndex] = updatedTemplate;
    templatesStorage.set(userId, userTemplates);

    console.log('✅ Template updated successfully:', templateId);

    return NextResponse.json({ 
      message: 'Template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    console.log('📧 Deleting email template:', templateId);

    // Get user's templates from memory storage
    const userTemplates = templatesStorage.get(userId) || [];
    const templateIndex = userTemplates.findIndex(t => t.id === templateId);

    if (templateIndex === -1) {
      return NextResponse.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    // Remove template
    const deletedTemplate = userTemplates.splice(templateIndex, 1)[0];
    templatesStorage.set(userId, userTemplates);

    console.log('✅ Template deleted successfully:', templateId);

    return NextResponse.json({ 
      message: 'Template deleted successfully',
      template: deletedTemplate
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
