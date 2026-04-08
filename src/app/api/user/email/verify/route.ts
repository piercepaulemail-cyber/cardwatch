import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/settings?email_error=missing-token", request.url));
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/settings?email_error=invalid-token", request.url));
  }

  // Parse the "change:<userId>:<newEmail>" format
  if (!record.email.startsWith("change:")) {
    return NextResponse.redirect(new URL("/settings?email_error=invalid-token", request.url));
  }

  const parts = record.email.split(":");
  const userId = parts[1];
  const newEmail = parts.slice(2).join(":"); // handle emails with colons (unlikely but safe)

  // Check the new email isn't taken by someone else
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return NextResponse.redirect(new URL("/settings?email_error=email-taken", request.url));
  }

  // Update the user's email
  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail, emailVerified: new Date() },
  });

  // Delete the token
  await prisma.verificationToken.delete({ where: { id: record.id } });

  return NextResponse.redirect(new URL("/settings?email_changed=true", request.url));
}
