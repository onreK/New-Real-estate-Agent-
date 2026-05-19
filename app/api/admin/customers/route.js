import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

const ADMIN_USER_IDS = [
  process.env.ADMIN_CLERK_ID_1,
  process.env.ADMIN_CLERK_ID_2,
].filter(Boolean);

function isAdmin(user) {
  return ADMIN_USER_IDS.includes(user.id) ||
    user.emailAddresses?.[0]?.emailAddress?.includes('@bizzybotai.com');
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const result = await query(`
      SELECT
        c.id,
        c.business_name,
        c.email,
        c.plan,
        c.status,
        c.created_at,
        c.stripe_customer_id,
        CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS has_ai_config,
        CASE WHEN g.id IS NOT NULL THEN true ELSE false END AS has_gmail,
        (
          SELECT COUNT(*) FROM ai_analytics_events ae WHERE ae.customer_id = c.id
        ) AS ai_interactions
      FROM customers c
      LEFT JOIN ai_configs a ON a.user_id = c.clerk_user_id
      LEFT JOIN gmail_connections g ON g.user_id = c.clerk_user_id AND g.status = 'connected'
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({ success: true, customers: result.rows });
  } catch (error) {
    console.error('❌ Admin customers error:', error);
    return NextResponse.json({ error: 'Failed to load customers', details: error.message }, { status: 500 });
  }
}
