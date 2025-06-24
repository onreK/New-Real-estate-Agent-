import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  console.log('Middleware triggered for:', pathname);
  
  // Only protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // For now, let's disable auth check completely to test
    console.log('Dashboard access - allowing for testing');
    return NextResponse.next();
    
    /* 
    // Re-enable this later when auth is working:
    const token = request.cookies.get('__session') || request.cookies.get('__clerk_db_jwt');
    
    if (!token) {
      console.log('No auth token, redirecting to sign-in');
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    */
  }
  
  // All other routes are public
  console.log('Public route, allowing access');
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only run on dashboard routes - main page is now public
    '/dashboard/:path*'
  ]
};
