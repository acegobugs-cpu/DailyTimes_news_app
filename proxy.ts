import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  const protectedRoutes = [
    "/dashboard",
    "/articles",
    "/files",
    "/categories",
    "/authorize-email",
  ];

  const publicRoutes = ["/login", "/register"];

  // Check if token is valid
  let isTokenValid = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isTokenValid = true;
    } catch (err) {
      // Token invalid - clear it and treat as no token
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  // Redirect unauthenticated users from protected routes to login
  if (
    !isTokenValid &&
    protectedRoutes.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isTokenValid && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Root path redirect
  if (pathname === "/") {
    if (isTokenValid) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except API routes and static assets
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
