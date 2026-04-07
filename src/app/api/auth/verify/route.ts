import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing-token", request.url)
    );
  }

  const email = await verifyToken(token);

  if (!email) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-token", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/login?verified=true", request.url)
  );
}
