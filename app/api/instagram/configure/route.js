import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS instagram_connections (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      customer_id INTEGER,
      page_id VARCHAR(255),
      access_token TEXT,
      business_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'connected',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const result = await query(
      `SELECT page_id, business_name, status, created_at, updated_at,
              access_token IS NOT NULL AS has_access_token
       FROM instagram_connections WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows[0]) return NextResponse.json({ configured: false });

    return NextResponse.json({ configured: true, connection: result.rows[0] });
  } catch (error) {
    console.error('❌ Instagram configure GET error:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTable();

    const { accessToken, pageId, businessName } = await request.json();

    if (!accessToken?.trim() || !pageId?.trim()) {
      return NextResponse.json({ error: 'accessToken and pageId are required' }, { status: 400 });
    }

    // Verify the token and page ID with Meta
    try {
      const testRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId.trim()}?access_token=${accessToken.trim()}`
      );
      const testData = await testRes.json();
      if (testData.error) throw new Error(testData.error.message);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid access token or page ID — could not verify with Meta' }, { status: 400 });
    }

    // Look up customer ID
    const customerResult = await query(
      `SELECT id FROM customers WHERE clerk_user_id = $1 LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));
    const customerId = customerResult.rows[0]?.id || null;

    await query(`
      INSERT INTO instagram_connections
        (user_id, customer_id, page_id, access_token, business_name, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'connected', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        customer_id  = EXCLUDED.customer_id,
        page_id      = EXCLUDED.page_id,
        access_token = EXCLUDED.access_token,
        business_name = EXCLUDED.business_name,
        status       = 'connected',
        updated_at   = NOW()
    `, [userId, customerId, pageId.trim(), accessToken.trim(), businessName?.trim() || '']);

    console.log('✅ Instagram connection saved to DB for user:', userId, 'page:', pageId);

    return NextResponse.json({
      success: true,
      message: 'Instagram AI configured successfully!',
      config: { pageId: pageId.trim(), businessName: businessName?.trim(), status: 'connected' }
    });
  } catch (error) {
    console.error('❌ Instagram configure POST error:', error);
    return NextResponse.json({ error: 'Failed to configure Instagram integration', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await query(
      `UPDATE instagram_connections SET status = 'disconnected', updated_at = NOW() WHERE user_id = $1`,
      [userId]
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
