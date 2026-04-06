import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, TIERS, type TierKey } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier } = (await request.json()) as { tier: TierKey };
  if (!TIERS[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tierConfig = TIERS[tier];

  // Check for existing subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (existingSub && ["active", "trialing"].includes(existingSub.status)) {
    return NextResponse.json(
      { error: "You already have an active subscription. Manage it from your dashboard." },
      { status: 400 }
    );
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer_email: session.user.email,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `CardWatch ${tierConfig.name}` },
          unit_amount: tierConfig.price,
          recurring: { interval: tierConfig.interval },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 3,
      metadata: {
        userId: session.user.id,
        tier,
        scanIntervalMinutes: tierConfig.scanIntervalMinutes.toString(),
      },
    },
    metadata: {
      userId: session.user.id,
      tier,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
