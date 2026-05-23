import { NextResponse } from 'next/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Show all rows in gmail_connections (mask tokens for security)
    const result = await query(`
      SELECT
        id,
        user_id,
        gmail_email,
        status,
        LEFT(access_token, 20) || '...' AS access_token_preview,
        CASE WHEN refresh_token IS NULL THEN 'NULL'
             WHEN refresh_token = '' THEN 'EMPTY'
             ELSE LEFT(refresh_token, 20) || '...'
        END AS refresh_token_status,
        token_expiry,
        to_timestamp(token_expiry / 1000) AS token_expiry_readable,
        CASE WHEN token_expiry > extract(epoch from now()) * 1000
             THEN 'VALID' ELSE 'EXPIRED'
        END AS access_token_expiry_status,
        updated_at,
        created_at
      FROM gmail_connections
      ORDER BY updated_at DESC
    `);

    return NextResponse.json({
      rowCount: result.rows.length,
      connections: result.rows,
      memoryConnections: global.gmailConnections
        ? Array.from(global.gmailConnections.entries()).map(([key, val]) => ({
            key,
            email: val.email,
            hasRefreshToken: !!val.refreshToken,
            hasAccessToken: !!val.accessToken
          }))
        : 'global.gmailConnections is null/undefined'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
