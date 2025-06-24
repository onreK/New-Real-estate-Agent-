import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
    "/api/chat",
    "/api/sites/(.*)",
    "/api/conversations",
    "/api/google-sheets",
    "/api/sms",
    "/api/calendly",
    "/api/widget/(.*)",
    // Allow all customer subdomain routes (like /test-fix, /test-business, etc.)
    "/((?!dashboard|onboarding).*)"
  ],
  // Routes that always require authentication  
  ignoredRoutes: [
    "/api/webhooks(.*)"
  ],
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!.*\\..*|_next).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ],
};
