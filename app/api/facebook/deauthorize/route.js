import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseSignedRequest(signedRequest, secret) {
  const [encodedSig, payload] = signedRequest.split('.');
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const expectedSig = createHmac('sha256', secret).update(payload).digest();
  if (!sig.equals(expectedSig)) return null;
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request');
    if (!signedRequest) return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });

    const secret = process.env.FACEBOOK_APP_SECRET;
    const data = parseSignedRequest(signedRequest, secret);
    if (!data) return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });

    const db = await getDb();
    await db.query(
      'DELETE FROM facebook_connections WHERE facebook_user_id = $1',
      [data.user_id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Facebook deauthorize error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
