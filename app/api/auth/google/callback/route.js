import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDbClient } from '../../../../../lib/database.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/api/auth/google/callback`
);

// Get or create customer by Clerk ID
async function getOrCreateCustomer(clerkUserId, email) {
  const client = await getDbClient();
  try {
    // First try to find existing customer by clerk_user_id
    let result = await client.query(
      'SELECT * FROM customers WHERE clerk_user_id = $1',
      [clerkUserId]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Found existing customer by Clerk ID');
      return result.rows[0];
    }
    
    // Try to find by email
    result = await client.query(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Found existing customer by email, updating clerk_user_id');
      // Update the clerk_user_id for this customer
      const updateResult = await client.query(
        'UPDATE customers SET clerk_user_id = $1 WHERE email = $2 RETURNING *',
        [clerkUserId, email]
      );
      return updateResult.rows[0];
    }
    
    // Create new customer
    console.log('📝 Creating new customer');
    const createResult = await client.query(
      `INSERT INTO customers (clerk_user_id, email, business_name, plan, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [clerkUserId, email, 'Demo Business', 'free']
    );
    
    console.log('✅ Created new customer');
    return createResult.rows[0];
    
  } finally {
    client.release();
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the Clerk user ID
    const error = searchParams.get('error');

    console.log('📧 Gmail OAuth callback received');
    console.log('Code present:', !!code);
    console.log('State (userId):', state);
    console.log('Error:', error);

    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?error=oauth_denied`);
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?error=invalid_callback`);
    }

    const userId = state; // Clerk user ID from state parameter
    console.log('🔗 Processing OAuth for user:', userId);

    // Exchange authorization code for access token
    console.log('🔄 Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Successfully exchanged code for tokens');
    console.log('Access token received:', !!tokens.access_token);
    console.log('Refresh token received:', !!tokens.refresh_token);

    // Get user's Gmail profile information
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    // Get user info to get their email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    console.log('✅ Retrieved Gmail profile:', userInfo.data.email);

    // Get or create customer
    const customer = await getOrCreateCustomer(userId, userInfo.data.email);
    console.log('✅ Customer ready:', customer.id);

    // Store Gmail connection in database
    const client = await getDbClient();
    try {
      // Check if gmail_connections table exists and if connection already exists
      const existingResult = await client.query(
        'SELECT id FROM gmail_connections WHERE customer_id = $1',
        [customer.id]
      ).catch(() => ({ rows: [] })); // Handle table not existing

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
        // Create new connection (with table creation fallback)
        try {
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
        } catch (tableError) {
          console.log('📝 Gmail connections table might not exist, storing in memory for now');
          // Store in global memory as fallback
          global.gmailConnections = global.gmailConnections || new Map();
          global.gmailConnections.set(customer.id, {
            customer_id: customer.id,
            gmail_email: userInfo.data.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: tokens.expiry_date,
            status: 'connected',
            created_at: new Date().toISOString()
          });
          
          console.log('✅ Gmail connection stored in memory');
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?success=gmail_connected&email=${encodeURIComponent(userInfo.data.email)}&mode=memory`);
        }
      }

      const result = await client.query(query, values);
      console.log('✅ Gmail connection saved to database');

      // Redirect back to email setup with success
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?success=gmail_connected&email=${encodeURIComponent(userInfo.data.email)}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Gmail OAuth callback error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Fallback: store in memory if database fails
    if (error.message.includes('duplicate key') || error.message.includes('table') || error.message.includes('database')) {
      console.log('💾 Database issue, storing Gmail connection in memory for demo');
      
      try {
        // Exchange tokens again if needed
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        // Store in global memory
        global.demoGmailConnection = {
          userId: state,
          email: userInfo.data.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date,
          status: 'connected',
          connectedAt: new Date().toISOString()
        };
        
        console.log('✅ Demo Gmail connection stored in memory');
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?success=gmail_connected&email=${encodeURIComponent(userInfo.data.email)}&mode=demo`);
        
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    }
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bizzybotai.com'}/email/setup?error=oauth_failed&details=${encodeURIComponent(error.message)}`);
  }
}
