import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scanForUser } from "@/lib/scanner";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!sub || !["active", "trialing"].includes(sub.status)) {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 }
    );
  }

  // Manual "Scan Now" always works — no interval gating
  // The interval only applies to automatic cron scans
  const result = await scanForUser(session.user.id, sub.scanIntervalMinutes);
  return NextResponse.json(result);
}
