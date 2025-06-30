import { auth } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (templateId) {
      const result = await query(
        'SELECT * FROM email_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );
      
      if (result.rows.length === 0) {
        return Response.json({ error: 'Template not found' }, { status: 404 });
      }

      return Response.json({ template: result.rows[0] });
    } else {
      const result = await query(
        'SELECT * FROM email_templates WHERE user_id = $1 ORDER BY category, name',
        [userId]
      );

      return Response.json({ templates: result.rows });
    }
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, category, subject, content, variables } = await request.json();

    if (!name || !category || !subject || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO email_templates (user_id, name, category, subject, content, variables, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [userId, name, category, subject, content, variables || '[]']
    );

    return Response.json({ 
      message: 'Template created successfully',
      template: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return Response.json({ error: 'Template ID required' }, { status: 400 });
    }

    const { name, category, subject, content, variables } = await request.json();

    if (!name || !category || !subject || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await query(
      `UPDATE email_templates 
       SET name = $1, category = $2, subject = $3, content = $4, variables = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7 
       RETURNING *`,
      [name, category, subject, content, variables || '[]', templateId, userId]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return Response.json({ 
      message: 'Template updated successfully',
      template: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return Response.json({ error: 'Template ID required' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM email_templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [templateId, userId]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return Response.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
