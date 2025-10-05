import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { getDbClient } from '@/lib/database';

// This API tracks usage for the current customer
// Call this whenever a customer uses a feature (sends email, SMS, starts conversation)
export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, metadata } = await request.json();
    
    // Validate type
    if (!['conversation', 'email', 'sms'].includes(type)) {
      return NextResponse.json({ error: 'Invalid usage type' }, { status: 400 });
    }
    
    const client = await getDbClient().connect();
    
    try {
      // Get customer ID
      const customerQuery = 'SELECT id FROM customers WHERE clerk_user_id = $1';
      const customerResult = await client.query(customerQuery, [user.id]);
      
      if (customerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      
      const customerId = customerResult.rows[0].id;
      
      // Track the usage
      const trackQuery = `
        INSERT INTO customer_usage (customer_id, type, metadata)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
      `;
      
      const result = await client.query(trackQuery, [
        customerId,
        type,
        JSON.stringify(metadata || {})
      ]);
      
      console.log(`✅ Tracked ${type} usage for customer ${customerId}`);
      
      return NextResponse.json({ 
        success: true,
        usageId: result.rows[0].id,
        timestamp: result.rows[0].created_at
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
    return NextResponse.json({ 
      error: 'Failed to track usage', 
      details: error.message 
    }, { status: 500 });
  }
}

// Get usage summary for the current billing period
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getDbClient().connect();
    
    try {
      // Get customer ID
      const customerQuery = 'SELECT id FROM customers WHERE clerk_user_id = $1';
      const customerResult = await client.query(customerQuery, [user.id]);
      
      if (customerResult.rows.length === 0) {
        return NextResponse.json({ 
          usage: {
            conversations: 0,
            emails: 0,
            sms: 0
          }
        });
      }
      
      const customerId = customerResult.rows[0].id;
      
      // Get usage for current month
      const usageQuery = `
        SELECT 
          type,
          COUNT(*) as count
        FROM customer_usage 
        WHERE customer_id = $1
          AND created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY type
      `;
      
      const usageResult = await client.query(usageQuery, [customerId]);
      
      // Format usage data
      const usage = {
        conversations: 0,
        emails: 0,
        sms: 0
      };
      
      usageResult.rows.forEach(row => {
        if (row.type === 'conversation') usage.conversations = parseInt(row.count);
        if (row.type === 'email') usage.emails = parseInt(row.count);
        if (row.type === 'sms') usage.sms = parseInt(row.count);
      });
      
      return NextResponse.json({ 
        success: true,
        usage,
        period: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting usage:', error);
    return NextResponse.json({ 
      error: 'Failed to get usage', 
      details: error.message 
    }, { status: 500 });
  }
}
