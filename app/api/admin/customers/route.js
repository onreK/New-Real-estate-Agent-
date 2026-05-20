import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

const ADMIN_USER_IDS = [
  process.env.ADMIN_CLERK_ID_1,
  process.env.ADMIN_CLERK_ID_2,
].filter(Boolean);

async function isAdmin(userId) {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  try {
    const res = await query('SELECT email FROM customers WHERE clerk_user_id = $1 LIMIT 1', [userId]);
    const email = res.rows[0]?.email || '';
    return email === process.env.ADMIN_EMAIL || email.includes('@bizzybotai.com');
  } catch (_) {
    return false;
  }
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    // Simple, safe query — no joins on tables that may not exist
    const result = await query(`
      SELECT
        id,
        business_name,
        email,
        plan,
        status,
        created_at,
        stripe_customer_id,
        clerk_user_id
      FROM customers
      ORDER BY created_at DESC
    `);

    const customers = result.rows;

    // Separately check which customers have AI configs (table may not exist)
    let aiConfigUsers = new Set();
    try {
      const aiRes = await query(`SELECT DISTINCT user_id FROM ai_configs WHERE user_id IS NOT NULL`);
      aiConfigUsers = new Set(aiRes.rows.map(r => r.user_id));
    } catch (_) {
      // ai_configs table may not exist yet — that's fine
    }

    // Separately check which customers have Gmail connected (table may not exist)
    let gmailUsers = new Set();
    try {
      const gmailRes = await query(`SELECT DISTINCT user_id FROM gmail_connections WHERE status = 'connected'`);
      gmailUsers = new Set(gmailRes.rows.map(r => r.user_id));
    } catch (_) {
      // gmail_connections table may not exist yet — that's fine
    }

    // Separately get AI interaction counts (table may not exist)
    let interactionMap = {};
    try {
      const intRes = await query(`
        SELECT customer_id, COUNT(*) as count
        FROM ai_analytics_events
        GROUP BY customer_id
      `);
      intRes.rows.forEach(r => { interactionMap[r.customer_id] = parseInt(r.count); });
    } catch (_) {
      // ai_analytics_events table may not exist yet — that's fine
    }

    const enriched = customers.map(c => ({
      ...c,
      has_ai_config: aiConfigUsers.has(c.clerk_user_id),
      has_gmail: gmailUsers.has(c.clerk_user_id),
      ai_interactions: interactionMap[c.id] || 0,
    }));

    return NextResponse.json({ success: true, customers: enriched });
  } catch (error) {
    console.error('❌ Admin customers error:', error);
    return NextResponse.json({ error: 'Failed to load customers', details: error.message }, { status: 500 });
  }
}
