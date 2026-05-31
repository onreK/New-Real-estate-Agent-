import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

function verifyState(signedState, secret) {
  const lastDot = signedState.lastIndexOf('.');
  if (lastDot === -1) return null;
  const payload = signedState.slice(0, lastDot);
  const receivedSig = signedState.slice(lastDot + 1);
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    const match = timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'));
    return match ? payload : null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com';
  try {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appSecret = process.env.FACEBOOK_APP_SECRET;

  // Verify HMAC signature on state before trusting any of its contents
  const payload = appSecret && state ? verifyState(state, appSecret) : null;
  if (!payload) {
    return NextResponse.redirect(`${baseUrl}/instagram-setup?error=oauth_invalid_state`);
  }

  const [userId, type] = payload.split(':');
  const setupPage = type === 'instagram' ? '/instagram-setup' : '/facebook-setup';

  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}${setupPage}?error=oauth_denied`);
  }
  if (!code || !userId) {
    return NextResponse.redirect(`${baseUrl}${setupPage}?error=oauth_failed`);
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const callbackUrl = `${baseUrl}/api/auth/facebook/callback`;

    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Token exchange failed');

    // 2. Upgrade to long-lived token (60 days — page tokens extended from this never expire)
    const longRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const userToken = longData.access_token || tokenData.access_token;

    // 3. Get list of Pages this user manages (with permanent page-level tokens)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts` +
      `?access_token=${userToken}&fields=id,name,access_token`
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(`${baseUrl}${setupPage}?error=no_pages`);
    }

    const page = pages[0]; // Use the first (most users have one business page)

    // Look up customer ID
    const customerResult = await query(
      `SELECT id FROM customers WHERE clerk_user_id = $1 LIMIT 1`, [userId]
    ).catch(() => ({ rows: [] }));
    const customerId = customerResult.rows[0]?.id || null;

    if (type === 'facebook') {
      await query(`
        CREATE TABLE IF NOT EXISTS facebook_connections (
          id SERIAL PRIMARY KEY, user_id VARCHAR(255) UNIQUE, customer_id INTEGER,
          page_id VARCHAR(255), page_name VARCHAR(255), page_access_token TEXT,
          verify_token VARCHAR(255), app_secret TEXT, business_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'connected',
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        )
      `).catch(() => {});

      await query(`
        INSERT INTO facebook_connections
          (user_id, customer_id, page_id, page_name, page_access_token, verify_token, app_secret, status, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'connected', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          page_id = EXCLUDED.page_id,
          page_name = EXCLUDED.page_name,
          page_access_token = EXCLUDED.page_access_token,
          status = 'connected',
          updated_at = NOW()
      `, [
        userId, customerId, page.id, page.name, page.access_token,
        process.env.FACEBOOK_VERIFY_TOKEN || 'bizzybot-fb-verify',
        appSecret
      ]);

      return NextResponse.redirect(
        `${baseUrl}/facebook-setup?success=connected&page=${encodeURIComponent(page.name)}`
      );
    }

    if (type === 'instagram') {
      // Get the Instagram Business Account linked to this Facebook Page
      const igRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}` +
        `?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      const igAccountId = igData.instagram_business_account?.id;

      if (!igAccountId) {
        return NextResponse.redirect(`${baseUrl}/instagram-setup?error=no_instagram`);
      }

      // Get Instagram username for display
      const igProfileRes = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}` +
        `?fields=username&access_token=${page.access_token}`
      );
      const igProfile = await igProfileRes.json();
      const username = igProfile.username || igAccountId;

      await query(`
        CREATE TABLE IF NOT EXISTS instagram_connections (
          id SERIAL PRIMARY KEY, user_id VARCHAR(255) UNIQUE, customer_id INTEGER,
          page_id VARCHAR(255), access_token TEXT,
          instagram_account_id VARCHAR(255), instagram_username VARCHAR(255),
          status VARCHAR(50) DEFAULT 'connected',
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        )
      `).catch(() => {});

      await query(`
        INSERT INTO instagram_connections
          (user_id, customer_id, page_id, access_token, instagram_account_id, instagram_username, status, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'connected', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          page_id = EXCLUDED.page_id,
          access_token = EXCLUDED.access_token,
          instagram_account_id = EXCLUDED.instagram_account_id,
          instagram_username = EXCLUDED.instagram_username,
          status = 'connected',
          updated_at = NOW()
      `, [userId, customerId, page.id, page.access_token, igAccountId, username]);

      return NextResponse.redirect(
        `${baseUrl}/instagram-setup?success=connected&username=${encodeURIComponent(username)}`
      );
    }

  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/instagram-setup?error=oauth_failed`);
  }

  } catch (outerErr) {
    console.error('Facebook OAuth outer error:', outerErr);
    return NextResponse.redirect(`${baseUrl}/instagram-setup?error=oauth_failed`);
  }
}
