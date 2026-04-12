import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ exists: false, verified: false });
  }

  // Rate limit to prevent enumeration
  const { allowed } = await rateLimit(`check-verified:${String(email).trim().toLowerCase()}`);
  if (!allowed) {
    return NextResponse.json({ exists: false, verified: false });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    select: { emailVerified: true, passwordHash: true },
  });

  // Only reveal unverified status (user needs to know to check their email).
  // For all other cases (not found, verified, Google-only), return the same response.
  if (user && user.passwordHash && !user.emailVerified) {
    return NextResponse.json({ exists: true, verified: false });
  }

  return NextResponse.json({ exists: false, verified: false });
}
