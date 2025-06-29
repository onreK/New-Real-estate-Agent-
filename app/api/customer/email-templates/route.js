// app/api/customer/email-templates/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  getCustomerByClerkId, 
  getDbClient 
} from '../../../../lib/database';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get templates for this customer
    const client = await getDbClient().connect();
    try {
      const query = 'SELECT * FROM email_templates WHERE customer_id = $1 ORDER BY category, name';
      const result = await client.query(query, [customer.id]);
      
      console.log(`✅ Retrieved ${result.rows.length} email templates for customer: ${customer.business_name}`);
      
      return NextResponse.json({
        success: true,
        templates: result.rows,
        customer: {
          id: customer.id,
          business_name: customer.business_name,
          email: customer.email
        }
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error getting email templates:', error);
    return NextResponse.json({ 
      error: 'Failed to get email templates',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, name, category, subject, content, variables } = body;

    if (!name || !category || !subject || !content) {
      return NextResponse.json({ 
        error: 'Name, category, subject, and content are required' 
      }, { status: 400 });
    }

    const client = await getDbClient().connect();
    try {
      let query, values, result;
      
      if (id) {
        // Update existing template
        query = `
          UPDATE email_templates 
          SET name = $1, category = $2, subject = $3, content = $4, variables = $5, updated_at = CURRENT_TIMESTAMP
          WHERE id = $6 AND customer_id = $7
          RETURNING *
        `;
        values = [name, category, subject, content, variables || [], id, customer.id];
      } else {
        // Create new template
        query = `
          INSERT INTO email_templates (customer_id, name, category, subject, content, variables)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        values = [customer.id, name, category, subject, content, variables || []];
      }
      
      result = await client.query(query, values);
      
      console.log('✅ Email template saved for customer:', customer.business_name);
      
      return NextResponse.json({
        success: true,
        template: result.rows[0],
        message: id ? 'Template updated successfully' : 'Template created successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving email template:', error);
    return NextResponse.json({ 
      error: 'Failed to save email template',
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from database
    const customer = await getCustomerByClerkId(user.id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ 
        error: 'Template ID is required' 
      }, { status: 400 });
    }

    const client = await getDbClient().connect();
    try {
      const query = 'DELETE FROM email_templates WHERE id = $1 AND customer_id = $2 RETURNING *';
      const result = await client.query(query, [templateId, customer.id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Template not found or unauthorized' 
        }, { status: 404 });
      }
      
      console.log('✅ Email template deleted for customer:', customer.business_name);
      
      return NextResponse.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error deleting email template:', error);
    return NextResponse.json({ 
      error: 'Failed to delete email template',
      details: error.message 
    }, { status: 500 });
  }
}
