// Gmail OAuth enabled - v3
// middleware.js
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/amanda(.*)",
    "/demo(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/clerk",
    "/api/contact",
    "/api/smtp/test",
    "/api/sms/webhook",
    "/api/facebook/webhook",
    "/api/instagram/webhook",        // Instagram webhook (public)
    "/api/email/webhook",
    "/api/widget/(.*)",
    "/api/leads",
    "/api/setup-database",
    "/api/hot-lead-detection",
    "/onboarding",
    "/pricing",
    "/privacy",
    "/terms",
    // Gmail OAuth routes - MUST be public for OAuth flow to work
    "/api/auth/google(.*)",  // This pattern should catch both routes
  ],
  
  // Routes that are completely ignored by Clerk (no auth checks)
  ignoredRoutes: [
    "/api/public(.*)",
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico",
    // ALSO add OAuth routes to ignored routes as backup
    "/api/auth/google",
    "/api/auth/google/callback",
    "/api/auth/google/status"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
