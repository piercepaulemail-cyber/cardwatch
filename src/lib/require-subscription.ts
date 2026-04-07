import { prisma } from "./db";

/**
 * Check if a user has an active subscription.
 * Returns the subscription if active, null otherwise.
 */
export async function requireSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return null;
  }

  return subscription;
}
