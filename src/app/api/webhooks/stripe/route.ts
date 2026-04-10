import { NextResponse } from "next/server";
import { getStripe, TIERS, type TierKey } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier as TierKey;
      console.log(`[Webhook] checkout.session.completed: userId=${userId}, tier=${tier}`);
      if (!userId || !tier) break;

      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      );

      const sub = subscription as unknown as Record<string, unknown>;
      const trialEnd = (sub.trial_end as number) || null;
      const periodEnd = (sub.current_period_end as number) || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const tierConfig = TIERS[tier];
      console.log(`[Webhook] Creating subscription: tier=${tier}, status=${subscription.status}, periodEnd=${periodEnd}`);

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          tier,
          scanIntervalMinutes: tierConfig.scanIntervalMinutes,
          status: subscription.status,
          trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
          currentPeriodEnd: new Date(periodEnd * 1000),
        },
        update: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          tier,
          scanIntervalMinutes: tierConfig.scanIntervalMinutes,
          status: subscription.status,
          trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
          currentPeriodEnd: new Date(periodEnd * 1000),
        },
      });
      console.log(`[Webhook] Subscription created for ${userId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (!existing) break;

      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodEnd: new Date(
            (subscription as unknown as Record<string, number>).current_period_end * 1000
          ),
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await prisma.subscription
        .update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        })
        .catch(() => {});
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as Record<string, unknown>;
      const subId = invoice.subscription as string | undefined;
      if (subId) {
        await prisma.subscription
          .update({
            where: { stripeSubscriptionId: subId },
            data: { status: "past_due" },
          })
          .catch(() => {});
      }
      break;
    }
  }
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    return NextResponse.json({ error: "Webhook processing failed", details: String(err) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
