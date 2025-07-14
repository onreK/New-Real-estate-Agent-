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
  console.log('🚀 === GMAIL OAUTH CALLBACK STARTED ===');
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the Clerk user ID
    const error = searchParams.get('error');
    const test = searchParams.get('test'); // For testing

    console.log('📧 Gmail OAuth callback received');
    console.log('📋 Code present:', !!code);
    console.log('👤 State (userId):', state);
    console.log('❌ Error param:', error);
    console.log('🧪 Test mode:', !!test);

    // Handle test mode
    if (test) {
      console.log('🧪 TEST MODE - Callback route is working!');
      return NextResponse.json({ 
        success: true, 
        message: 'Callback route is working!',
        timestamp: new Date().toISOString()
      });
    }

    if (error) {
      console.error('❌ OAuth error parameter:', error);
      return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=oauth_denied&details=${error}`);
    }

    if (!code) {
      console.error('❌ Missing authorization code');
      return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=missing_code`);
    }

    if (!state) {
      console.error('❌ Missing state parameter (user ID)');
      return NextResponse.redirect(`https://bizzybotai.com/email/setup?error=missing_user_id`);
    }

    console.log('🔄 Step 1: Exchanging authorization code for tokens...');
    
    // Exchange authorization code for access token
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Step 1 Complete: Tokens received');
    console.log('🔑 Access token length:', tokens.access_token ? tokens.access_token.length : 'MISSING');
    console.log('🔄 Refresh token present:', !!tokens.refresh_token);
    console.log('⏰ Token expiry:', tokens.expiry_date);

    oauth2Client.setCredentials(tokens);
    console.log('✅ OAuth client credentials set');

    console.log('🔄 Step 2: Getting user info from Google...');
    
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;

    console.log('✅ Step 2 Complete: User email retrieved:', userEmail);
    console.log('👤 User name:', userInfo.data.name);
    console.log('🆔 User ID from Google:', userInfo.data.id);

    console.log('🔄 Step 3: Storing Gmail connection in memory...');

    // Initialize global storage if it doesn't exist
    if (!global.gmailConnections) {
      global.gmailConnections = new Map();
      console.log('🆕 Initialized global Gmail connections storage');
    }

    // Create connection object
    const connectionData = {
      userId: state,
      email: userEmail,
      userName: userInfo.data.name,
      googleUserId: userInfo.data.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastChecked: new Date().toISOString()
    };

    console.log('📊 Connection data created:', {
      userId: connectionData.userId,
      email: connectionData.email,
      hasAccessToken: !!connectionData.accessToken,
      hasRefreshToken: !!connectionData.refreshToken,
      status: connectionData.status
    });

    // Store the connection
    global.gmailConnections.set(state, connectionData);
    
    console.log('✅ Step 3 Complete: Gmail connection stored in memory');
    console.log('📈 Total Gmail connections stored:', global.gmailConnections.size);
    console.log('🔍 Stored connection keys:', Array.from(global.gmailConnections.keys()));

    // Verify storage worked
    const storedConnection = global.gmailConnections.get(state);
    if (storedConnection) {
      console.log('✅ VERIFICATION: Connection successfully retrieved from storage');
      console.log('📧 Stored email:', storedConnection.email);
    } else {
      console.error('❌ VERIFICATION FAILED: Could not retrieve stored connection');
    }

    console.log('🔄 Step 4: Redirecting to success page...');

    // Create success URL with detailed parameters
    const successUrl = `https://bizzybotai.com/email/setup?success=gmail_connected&email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(state)}&timestamp=${Date.now()}`;
    
    console.log('🔗 Redirect URL:', successUrl);
    console.log('🎉 === GMAIL OAUTH CALLBACK COMPLETED SUCCESSFULLY ===');

    // Redirect back with success
    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('❌ === GMAIL OAUTH CALLBACK ERROR ===');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Log the full error details
    if (error.response) {
      console.error('❌ HTTP Response Error:', error.response.status, error.response.statusText);
      console.error('❌ Response data:', error.response.data);
    }
    
    const errorUrl = `https://bizzybotai.com/email/setup?error=oauth_failed&message=${encodeURIComponent(error.message)}&timestamp=${Date.now()}`;
    console.log('🔗 Error redirect URL:', errorUrl);
    
    return NextResponse.redirect(errorUrl);
  }
}
