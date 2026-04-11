import webPush from "web-push";
import { prisma } from "./db";
import type { EbayResult } from "./ebay";

function getWebPush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return null;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return webPush;
}

export async function sendPushNotifications(
  userId: string,
  results: EbayResult[]
): Promise<void> {
  const wp = getWebPush();
  if (!wp) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) return;

  const count = results.length;
  const topCard = results[0];
  const payload = JSON.stringify({
    title: `CardWatch: ${count} new listing${count !== 1 ? "s" : ""} found`,
    body: topCard
      ? `$${topCard.currentPrice.toFixed(2)} — ${topCard.title.substring(0, 60)}`
      : `${count} cards matching your watchlist`,
    tag: `cardwatch-${Date.now()}`,
    data: { url: "/dashboard" },
  });

  for (const sub of subscriptions) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.auth, p256dh: sub.p256dh },
        },
        payload
      );
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      // Remove expired/revoked subscriptions
      if (error.statusCode === 404 || error.statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => {});
      }
      console.error(`[Push] Failed for ${sub.endpoint}:`, err);
    }
  }
}
