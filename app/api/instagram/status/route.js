import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      `SELECT page_id, instagram_username, business_name, status, created_at
       FROM instagram_connections
       WHERE user_id = $1 AND status = 'connected'
       LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const conn = result.rows[0];
    if (!conn) return NextResponse.json({ configured: false, status: 'not_configured' });

    return NextResponse.json({
      configured: true,
      status: 'active',
      pageId: conn.page_id,
      username: conn.instagram_username || null,
      businessName: conn.business_name || null,
      connectedAt: conn.created_at,
    });
  } catch (error) {
    console.error('❌ Instagram status error:', error);
    return NextResponse.json({ configured: false, status: 'error' }, { status: 500 });
  }
}
