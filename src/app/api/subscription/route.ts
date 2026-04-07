import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUseScanInterval } from "@/lib/stripe";

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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanIntervalMinutes } = await request.json();
  if (!scanIntervalMinutes || typeof scanIntervalMinutes !== "number") {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  if (!canUseScanInterval(scanIntervalMinutes, subscription.tier)) {
    return NextResponse.json(
      { error: "Upgrade your plan to use this scan interval" },
      { status: 403 }
    );
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { scanIntervalMinutes },
  });

  return NextResponse.json({ success: true, scanIntervalMinutes });
}
