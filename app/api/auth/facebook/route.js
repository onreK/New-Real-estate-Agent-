import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

export function signState(payload, secret) {
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// Initiates Facebook/Instagram OAuth flow
// ?type=facebook (default) or ?type=instagram
export async function GET(request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'facebook';

  const appId = process.env.FACEBOOK_APP_ID;
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !secret) {
    const setupPage = type === 'instagram' ? '/instagram-setup' : '/facebook-setup';
    return NextResponse.redirect(new URL(`${setupPage}?error=not_configured`, request.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com';
  const callbackUrl = `${baseUrl}/api/auth/facebook/callback`;

  const scopes = [
    'pages_messaging',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',');

  // Sign state with HMAC so the callback can verify it wasn't forged.
  // Format: userId:type.<hmac_signature>
  const state = signState(`${userId}:${type}`, secret);

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(authUrl.toString());
}
