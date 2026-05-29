import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

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
  if (!appId) {
    console.error('FACEBOOK_APP_ID env var not set');
    const setupPage = type === 'instagram' ? '/instagram-setup' : '/facebook-setup';
    return NextResponse.redirect(
      new URL(`${setupPage}?error=not_configured`, request.url)
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com';
  const callbackUrl = `${baseUrl}/api/auth/facebook/callback`;

  // Request all scopes needed for both Facebook Messenger and Instagram DMs.
  // Even for Instagram-only connects, we need the pages_* scopes because
  // Instagram Business accounts are always linked through a Facebook Page.
  const scopes = [
    'pages_messaging',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',');

  const state = `${userId}:${type}`;

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(authUrl.toString());
}
