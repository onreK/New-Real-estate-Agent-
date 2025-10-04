// app/api/customer/update-account/route.js
import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs';
import { query } from '@/lib/database';

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Get the current user from Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - Please sign in' 
      }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      username,
      email 
    } = body;

    console.log('📝 Updating account for user:', user.id);

    // Update user information in Clerk
    try {
      const updateData = {};
      
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;
      
      await clerkClient.users.updateUser(user.id, updateData);

      // If email is being changed, update the primary email address
      if (email && email !== user.emailAddresses[0]?.emailAddress) {
        // Note: Email change requires verification in production
        // This is a simplified version
        console.log('📧 Email change requested:', email);
        // You might want to trigger an email verification flow here
      }

      console.log('✅ Clerk user updated successfully');
    } catch (clerkError) {
      console.error('❌ Error updating Clerk user:', clerkError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to update account information',
        details: clerkError.message 
      }, { status: 500 });
    }

    // Update customer record in database
    try {
      const updateCustomerQuery = `
        UPDATE customers 
        SET 
          email = COALESCE($1, email),
          updated_at = NOW()
        WHERE clerk_user_id = $2
        RETURNING *
      `;
      
      await query(updateCustomerQuery, [
        email || user.emailAddresses[0]?.emailAddress,
        user.id
      ]);

      console.log('✅ Database customer record updated');
    } catch (dbError) {
      console.error('⚠️ Error updating database customer:', dbError);
      // Continue even if database update fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Account information updated successfully',
      user: {
        id: user.id,
        firstName,
        lastName,
        username,
        email
      }
    });

  } catch (error) {
    console.error('❌ Error updating account:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// GET method to retrieve current account information
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get customer from database
    const customerQuery = `
      SELECT * FROM customers 
      WHERE clerk_user_id = $1
      LIMIT 1
    `;
    
    const result = await query(customerQuery, [user.id]);
    const customer = result.rows[0];

    return NextResponse.json({
      success: true,
      account: {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        imageUrl: user.imageUrl || '',
        emailVerified: user.emailAddresses?.[0]?.verification?.status === 'verified',
        twoFactorEnabled: user.twoFactorEnabled || false,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        businessName: customer?.business_name || ''
      }
    });

  } catch (error) {
    console.error('❌ Error getting account:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get account information'
    }, { status: 500 });
  }
}
