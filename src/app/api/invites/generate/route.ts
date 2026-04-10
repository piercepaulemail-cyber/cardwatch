import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "BETA-";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const count = Math.min(body.count || 1, 100);
  const tier = body.tier || "elite";

  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = generateCode();
    // Ensure unique
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = generateCode();
    }

    await prisma.inviteCode.create({
      data: { code, tier, durationDays: 0 },
    });

    codes.push(code);
  }

  return NextResponse.json({ codes });
}
