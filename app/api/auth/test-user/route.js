import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs';

export async function GET() {
  try {
    console.log('🔍 Testing user authentication...');
    
    const results = {
      authMethod1: null,
      authMethod2: null,
      user: null,
      errors: []
    };

    // Test auth() method (used in dashboard route)
    try {
      const { userId } = auth();
      results.authMethod1 = {
        method: 'auth() from @clerk/nextjs/server',
        userId: userId,
        success: !!userId
      };
      console.log('✅ Auth method 1 result:', userId);
    } catch (error) {
      results.errors.push(`Auth method 1 failed: ${error.message}`);
      results.authMethod1 = { success: false, error: error.message };
    }

    // Test currentUser() method (used in customer routes)
    try {
      const user = await currentUser();
      results.authMethod2 = {
        method: 'currentUser() from @clerk/nextjs',
        userId: user?.id,
        success: !!user?.id
      };
      results.user = user ? {
        id: user.id,
        emailAddress: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName
      } : null;
      console.log('✅ Auth method 2 result:', user?.id);
    } catch (error) {
      results.errors.push(`Auth method 2 failed: ${error.message}`);
      results.authMethod2 = { success: false, error: error.message };
    }

    const overallSuccess = results.authMethod1?.success || results.authMethod2?.success;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? 'User authentication working' : 'User not authenticated',
      userId: results.authMethod1?.userId || results.authMethod2?.userId,
      results
    });

  } catch (error) {
    console.error('❌ User auth test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'User auth test failed',
      details: error.message
    }, { status: 500 });
  }
}
