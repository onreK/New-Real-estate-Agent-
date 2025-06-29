// app/api/customer/email-settings/route.js
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

    // Get email settings for this customer
    const client = await getDbClient().connect();
    try {
      const query = 'SELECT * FROM email_settings WHERE customer_id = $1';
      const result = await client.query(query, [customer.id]);
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0] || null,
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
    console.error('❌ Error getting email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to get email settings',
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
    const { setup_method, custom_domain, business_name, email_address } = body;

    if (!setup_method || !business_name || !email_address) {
      return NextResponse.json({ 
        error: 'Setup method, business name, and email address are required' 
      }, { status: 400 });
    }

    const client = await getDbClient().connect();
    try {
      // Check if settings exist
      const checkQuery = 'SELECT id FROM email_settings WHERE customer_id = $1';
      const checkResult = await client.query(checkQuery, [customer.id]);
      
      let query, values;
      
      if (checkResult.rows.length > 0) {
        // Update existing settings
        query = `
          UPDATE email_settings 
          SET setup_method = $1, custom_domain = $2, business_name = $3, 
              email_address = $4, updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $5
          RETURNING *
        `;
        values = [setup_method, custom_domain, business_name, email_address, customer.id];
      } else {
        // Create new settings
        query = `
          INSERT INTO email_settings (customer_id, setup_method, custom_domain, business_name, email_address)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        values = [customer.id, setup_method, custom_domain, business_name, email_address];
      }
      
      const result = await client.query(query, values);
      
      console.log('✅ Email settings saved for customer:', customer.business_name);
      
      return NextResponse.json({
        success: true,
        settings: result.rows[0],
        message: 'Email settings saved successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error saving email settings:', error);
    return NextResponse.json({ 
      error: 'Failed to save email settings',
      details: error.message 
    }, { status: 500 });
  }
}
