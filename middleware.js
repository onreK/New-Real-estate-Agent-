import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/demo",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks/clerk",
    "/api/smtp/test"
  ],
  
  // Routes that require authentication
  protectedRoutes: [
    "/dashboard(.*)",
    "/profile(.*)",
    "/settings(.*)"
  ],

  // Don't protect API routes by default unless specified
  ignoredRoutes: [
    "/api/public(.*)",
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico",
    "/api/smtp/test"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
