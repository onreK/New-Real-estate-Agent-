import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getCustomerByClerkId, getDbClient } from '../../../../lib/database.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the Clerk user ID
    const error = searchParams.get('error');

    console.log('📧 Gmail OAuth callback received');

    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/email/setup?error=oauth_denied`);
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/email/setup?error=invalid_callback`);
    }

    const userId = state; // Clerk user ID from state parameter
    console.log('🔗 Processing OAuth for user:', userId);

    // Get customer from database
    const customer = await getCustomerByClerkId(userId);
    
    if (!customer) {
      console.error('❌ Customer not found for user:', userId);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/email/setup?error=user_not_found`);
    }

    // Exchange authorization code for access token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Successfully exchanged code for tokens');

    // Get user's Gmail profile information
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    // Get user info to get their email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    console.log('✅ Retrieved Gmail profile:', userInfo.data.email);

    // Store Gmail connection in database
    const client = await getDbClient();
    try {
      // Check if connection already exists
      const existingResult = await client.query(
        'SELECT id FROM gmail_connections WHERE customer_id = $1',
        [customer.id]
      );

      let query, values;
      
      if (existingResult.rows.length > 0) {
        // Update existing connection
        query = `
          UPDATE gmail_connections 
          SET gmail_email = $1, access_token = $2, refresh_token = $3, 
              token_expiry = $4, status = 'connected', updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $5
          RETURNING *
        `;
        values = [
          userInfo.data.email,
          tokens.access_token,
          tokens.refresh_token,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          customer.id
        ];
      } else {
        // Create new connection
        query = `
          INSERT INTO gmail_connections (
            customer_id, gmail_email, access_token, refresh_token, 
            token_expiry, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'connected', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        values = [
          customer.id,
          userInfo.data.email,
          tokens.access_token,
          tokens.refresh_token,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null
        ];
      }

      const result = await client.query(query, values);
      console.log('✅ Gmail connection saved to database');

      // Set up Gmail push notifications (Pub/Sub)
      try {
        await setupGmailWatch(gmail, customer.id);
        console.log('✅ Gmail watch setup completed');
      } catch (watchError) {
        console.error('⚠️ Gmail watch setup failed:', watchError.message);
        // Don't fail the whole process if watch setup fails
      }

      // Redirect back to email setup with success
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/email/setup?success=gmail_connected&email=${encodeURIComponent(userInfo.data.email)}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Gmail OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/email/setup?error=oauth_failed`);
  }
}

// Set up Gmail push notifications
async function setupGmailWatch(gmail, customerId) {
  try {
    // Create a unique topic name for this customer
    const topicName = `bizzy-bot-gmail-${customerId}`;
    
    const watchRequest = {
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/${topicName}`,
        labelFilterAction: 'include'
      }
    };

    const response = await gmail.users.watch(watchRequest);
    console.log('✅ Gmail watch setup:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Gmail watch setup error:', error);
    throw error;
  }
}
