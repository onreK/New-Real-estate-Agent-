import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Only protect dashboard routes - let everything else be public
  if (pathname.startsWith('/dashboard')) {
    // Check if user is authenticated for dashboard access
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      // Redirect to YOUR login page, not Vercel's
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // All other routes (including customer sites) are public
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only run middleware on dashboard routes
    '/dashboard/:path*'
  ]
};
