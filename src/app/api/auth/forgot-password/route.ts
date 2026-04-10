import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const trimmed = String(email).trim().toLowerCase();

  // Rate limit: 3 requests per email per hour
  const { allowed } = await rateLimit(`forgot-password:${trimmed}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email: trimmed } });

  if (user && user.passwordHash) {
    const token = await createPasswordResetToken(trimmed);
    await sendPasswordResetEmail(trimmed, token);
  }

  return NextResponse.json({ success: true });
}
