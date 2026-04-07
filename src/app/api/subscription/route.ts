import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    tier: subscription.tier,
    status: subscription.status,
    scanIntervalMinutes: subscription.scanIntervalMinutes,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}
