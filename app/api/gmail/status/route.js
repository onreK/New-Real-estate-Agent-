import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();

    let connection = null;

    // Method 1: Look up by authenticated Clerk user ID
    if (userId) {
      try {
        const dbResult = await query(
          `SELECT * FROM gmail_connections WHERE user_id = $1 AND status = 'connected' ORDER BY updated_at DESC LIMIT 1`,
          [userId]
        );
        if (dbResult.rows.length > 0) {
          const row = dbResult.rows[0];
          connection = { id: row.id, email: row.gmail_email, status: row.status, connectedAt: row.created_at, source: 'database-user' };
        }
      } catch (dbError) {
        console.error('DB lookup by user_id failed:', dbError.message);
      }
    }

    // Method 2: Check in-memory store by user ID
    if (!connection && userId && global.gmailConnections) {
      const memConn = global.gmailConnections.get(userId);
      if (memConn) {
        connection = { email: memConn.email, status: memConn.status || 'connected', connectedAt: memConn.connectedAt, source: 'memory' };
      }
    }

    return NextResponse.json({
      success: true,
      connected: !!connection,
      connection: connection,
      message: connection ? `Gmail connected: ${connection.email}` : 'No Gmail connection found'
    });

  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json({ success: false, connected: false, connection: null, error: 'Failed to check Gmail status' }, { status: 500 });
  }
}
