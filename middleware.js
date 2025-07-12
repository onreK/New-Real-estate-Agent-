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
    "/terms"
  ],
  
  // Routes that are completely ignored by Clerk (no auth checks)
  ignoredRoutes: [
    "/api/public(.*)",
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
