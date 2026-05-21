import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

let getDbClient;

async function initDb() {
  if (!getDbClient) {
    const db = await import('@/lib/database');
    getDbClient = db.getDbClient;
  }
  return getDbClient;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ notifications: [] }, { status: 401 });

    const getDb = await initDb();
    let client;
    try {
      client = await getDb().connect();
    } catch {
      return NextResponse.json({ notifications: [] });
    }

    try {
      // Get customer record
      const customerResult = await client.query(
        'SELECT id FROM customers WHERE clerk_user_id = $1',
        [user.id]
      );

      if (customerResult.rows.length === 0) {
        return NextResponse.json({ notifications: [] });
      }

      const customerId = customerResult.rows[0].id;

      // Query recent hot leads (last 14 days)
      const leadsResult = await client.query(
        `SELECT id, first_name, last_name, email, phone, channel, temperature, created_at
         FROM hot_leads
         WHERE customer_id = $1
           AND created_at > NOW() - INTERVAL '14 days'
         ORDER BY created_at DESC
         LIMIT 20`,
        [customerId]
      );

      const notifications = leadsResult.rows.map(lead => {
        const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
                     lead.phone || lead.email || 'Unknown contact';
        return {
          id: `hot_lead_${lead.id}`,
          type: 'hot_lead',
          title: 'Hot lead detected',
          description: name,
          channel: lead.channel || 'web',
          temperature: lead.temperature || 'hot',
          timestamp: lead.created_at,
          href: '/leads'
        };
      });

      return NextResponse.json({ notifications });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ notifications: [] });
  }
}
