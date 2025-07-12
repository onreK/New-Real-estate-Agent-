// middleware.js
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/amanda',
  '/demo',
  '/api/chat',
  '/api/webhook',
  '/api/sms/webhook',
  '/api/facebook/webhook',        // Facebook webhook (public)
  '/api/instagram/webhook',       // Instagram webhook (public) ← NEW
  '/api/email/webhook',
  '/api/widget/(.*)',
  '/api/leads',
  '/api/setup-database',
  '/api/hot-lead-detection',
  '/onboarding',
  '/pricing',
  '/privacy',
  '/terms'
]);

export default clerkMiddleware((auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return;
  }
  
  // Require authentication for all other routes
  auth().protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
