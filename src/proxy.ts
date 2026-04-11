import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected routes that require auth
  if (pathname.startsWith("/dashboard")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login") {
    const session = await auth();
    if (session) {
      // Let the dashboard handle the subscription check
      return NextResponse.redirect(new URL("/dashboard", req.url), { status: 302 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
