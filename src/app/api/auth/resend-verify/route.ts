import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createVerificationToken, sendVerificationEmail } from "@/lib/verification";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const trimmed = String(email).trim().toLowerCase();

  // Rate limit: 3 resends per email per hour
  const { allowed } = await rateLimit(`resend-verify:${trimmed}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: trimmed } });

  if (!user) {
    // Don't reveal whether the email exists
    return NextResponse.json({ success: true });
  }

  if (user.emailVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const token = await createVerificationToken(trimmed);
  await sendVerificationEmail(trimmed, token);

  return NextResponse.json({ success: true });
}
