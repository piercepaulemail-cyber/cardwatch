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

  // Check scan interval
  if (sub.lastScanAt) {
    const elapsed = (Date.now() - sub.lastScanAt.getTime()) / 60000;
    if (elapsed < sub.scanIntervalMinutes) {
      const waitMinutes = Math.ceil(sub.scanIntervalMinutes - elapsed);
      return NextResponse.json(
        { error: `Please wait ${waitMinutes} more minutes before scanning again` },
        { status: 429 }
      );
    }
  }

  const result = await scanForUser(session.user.id, sub.scanIntervalMinutes);
  return NextResponse.json(result);
}
