import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the Clerk user ID
    const error = searchParams.get('error');

    console.log('📧 Gmail OAuth callback received');
    console.log('Code present:', !!code);
    console.log('State (userId):', state);

    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=oauth_denied`);
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=invalid_callback`);
    }

    console.log('🔄 Exchanging code for tokens...');
    
    // Exchange authorization code for access token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Tokens received successfully');

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;

    console.log('✅ User email retrieved:', userEmail);

    // Store in global memory for demo (bypassing database completely)
    if (!global.gmailConnections) {
      global.gmailConnections = new Map();
    }

    global.gmailConnections.set(state, {
      userId: state,
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      status: 'connected',
      connectedAt: new Date().toISOString()
    });

    console.log('✅ Gmail connection stored successfully for user:', state);
    console.log('📧 Total Gmail connections in memory:', global.gmailConnections.size);

    // Redirect back with success
    return NextResponse.redirect(`https://bizzybotai.com/email/setup?success=gmail_connected&email=${encodeURIComponent(userEmail)}`);

  } catch (error) {
    console.error('❌ Gmail OAuth callback error:', error);
    return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
}
