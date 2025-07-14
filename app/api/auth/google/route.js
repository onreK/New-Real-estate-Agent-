import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { getCustomerByClerkId, getDbClient } from '../../../../lib/database.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Gmail API scopes we need
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔗 Starting Gmail OAuth flow for user:', userId);

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Important: get refresh token
      scope: SCOPES,
      state: userId, // Pass user ID in state for verification
      prompt: 'consent', // Force consent screen to get refresh token
      include_granted_scopes: true // Include previously granted scopes
    });

    console.log('✅ Generated OAuth URL:', authUrl);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('❌ Gmail OAuth error:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate Gmail OAuth',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint can be used to check Gmail connection status
    const customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if user has Gmail connected
    const client = await getDbClient();
    try {
      const result = await client.query(
        'SELECT * FROM gmail_connections WHERE customer_id = $1',
        [customer.id]
      );
      
      const gmailConnection = result.rows[0];
      
      return NextResponse.json({
        success: true,
        connected: !!gmailConnection,
        email: gmailConnection?.gmail_email || null,
        status: gmailConnection?.status || 'disconnected'
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Gmail connection check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check Gmail connection',
      details: error.message 
    }, { status: 500 });
  }
}
