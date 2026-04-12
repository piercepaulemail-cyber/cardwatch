import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TIERS, type TierKey } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  const { allowed } = await rateLimit(`invite-redeem:${session.user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const trimmed = code.trim().toUpperCase();

  // Find the code
  const invite = await prisma.inviteCode.findUnique({
    where: { code: trimmed },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "This invite code has already been used" }, { status: 400 });
  }

  // Check if user already has an active subscription
  const existing = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (existing && ["active", "trialing"].includes(existing.status)) {
    return NextResponse.json({ error: "You already have an active subscription" }, { status: 400 });
  }

  const tier = invite.tier as TierKey;
  const tierConfig = TIERS[tier] || TIERS.elite;

  // Calculate expiration
  const currentPeriodEnd =
    invite.durationDays > 0
      ? new Date(Date.now() + invite.durationDays * 24 * 60 * 60 * 1000)
      : new Date("2099-12-31T00:00:00Z"); // lifetime

  // Create subscription (no Stripe)
  if (existing) {
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        tier,
        scanIntervalMinutes: tierConfig.scanIntervalMinutes,
        status: "active",
        currentPeriodEnd,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        tier,
        scanIntervalMinutes: tierConfig.scanIntervalMinutes,
        status: "active",
        currentPeriodEnd,
      },
    });
  }

  // Mark code as used
  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedByUserId: session.user.id },
  });

  // Auto-verify email for invited users
  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ success: true, tier });
}
