import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, TIERS, type TierKey } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// Annual prices (20% off monthly): Scout $3.99, Pro $11.99, Elite $23.99
const ANNUAL_PRICES: Record<string, number> = {
  scout: 4788,  // $47.88/year ($3.99/mo)
  pro: 14388,   // $143.88/year ($11.99/mo)
  elite: 28788, // $287.88/year ($23.99/mo)
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier, annual } = (await request.json()) as {
    tier: TierKey;
    annual?: boolean;
  };
  if (!TIERS[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tierConfig = TIERS[tier];

  const existingSub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (existingSub && ["active", "trialing"].includes(existingSub.status)) {
    return NextResponse.json(
      {
        error:
          "You already have an active subscription. Manage it from your dashboard.",
      },
      { status: 400 }
    );
  }

  const isAnnual = annual === true;
  const unitAmount = isAnnual ? ANNUAL_PRICES[tier] : tierConfig.price;
  const interval = isAnnual ? "year" : "month";
  const planLabel = isAnnual
    ? `CardWatch ${tierConfig.name} (Annual)`
    : `CardWatch ${tierConfig.name}`;

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer_email: session.user.email,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: planLabel },
          unit_amount: unitAmount,
          recurring: { interval: interval as "month" | "year" },
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
