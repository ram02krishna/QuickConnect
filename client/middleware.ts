import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("quickconnect_token")?.value;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-email");

  const isProtectedRoute =
    pathname.startsWith("/chats") ||
    pathname.startsWith("/profile");

  // 1. Block unauthenticated access to protected routes and redirect to login with return URL
  if (isProtectedRoute && !token) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect logged-in users away from auth pages to their chats
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chats/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
  ],
};
