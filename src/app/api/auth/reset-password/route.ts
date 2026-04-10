import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyPasswordResetToken, deletePasswordResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  const { token, newPassword } = await request.json();

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }

  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (String(newPassword).length > 128) {
    return NextResponse.json({ error: "Password is too long" }, { status: 400 });
  }

  const email = await verifyPasswordResetToken(token);

  if (!email) {
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await deletePasswordResetToken(token);

  return NextResponse.json({ success: true });
}
