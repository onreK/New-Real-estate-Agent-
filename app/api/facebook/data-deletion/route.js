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
    await db.query('DELETE FROM facebook_connections WHERE facebook_user_id = $1', [data.user_id]);
    await db.query('DELETE FROM instagram_connections WHERE facebook_user_id = $1', [data.user_id]);

    const confirmationCode = `del_${data.user_id}_${Date.now()}`;
    const statusUrl = `https://bizzybotai.com/privacy`;

    return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
  } catch (err) {
    console.error('Facebook data deletion error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
