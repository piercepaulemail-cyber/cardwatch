import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Register + auto-verify for invite code redemption.
 * Skips email verification since the user has a valid invite code.
 */
export async function POST(request: Request) {
  const { email, password, name, code } = await request.json();

  if (!email || !password || !code) {
    return NextResponse.json(
      { error: "Email, password, and invite code are required" },
      { status: 400 }
    );
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedCode = String(code).trim().toUpperCase();

  // Validate invite code exists and is unused
  const invite = await prisma.inviteCode.findUnique({
    where: { code: trimmedCode },
  });

  if (!invite || invite.usedAt) {
    return NextResponse.json(
      { error: "Invalid or already used invite code" },
      { status: 400 }
    );
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Check existing user
  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in and redeem from the redeem page." },
      { status: 409 }
    );
  }

  // Create user with email already verified
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: trimmedEmail,
      name: name ? String(name).trim().slice(0, 100) : null,
      passwordHash,
      emailVerified: new Date(), // Auto-verified for invite users
    },
  });

  return NextResponse.json({ success: true });
}
