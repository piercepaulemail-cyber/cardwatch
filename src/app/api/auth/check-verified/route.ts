import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    select: { emailVerified: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    // User doesn't exist or is Google-only — don't reveal
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    verified: !!user.emailVerified,
  });
}
