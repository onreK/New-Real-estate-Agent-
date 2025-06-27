import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/demo",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/clerk",
    "/api/sms/webhook",
    "/api/setup-database",
    "/api/inspect-database",
    "/api/inspect-messages"
  ],
  // Routes that can always be accessed, and have no authentication information
  ignoredRoutes: [
    "/api/webhooks/clerk",
    "/api/sms/webhook",
    "/api/setup-database",
    "/api/inspect-database", 
    "/api/inspect-messages"
  ],
  // After sign in, redirect to dashboard
  afterSignInUrl: "/dashboard",
  // After sign up, redirect to onboarding  
  afterSignUpUrl: "/onboarding",
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
