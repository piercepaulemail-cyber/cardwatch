import { prisma } from "./db";
import { runUserScan, type EbaySearchQuery } from "./ebay";
import { sendCardAlertEmail } from "./email";

export async function scanForUser(userId: string, lookbackMinutes: number) {
  const entries = await prisma.watchlistEntry.findMany({
    where: { userId },
  });

  if (!entries.length) return { found: 0 };

  const queries: EbaySearchQuery[] = entries.map((e) => ({
    playerName: e.playerName,
    cardDescription: e.cardDescription,
    maxPrice: e.maxPrice,
  }));

  const results = await runUserScan(queries, lookbackMinutes);

  let newCount = 0;
  for (const result of results) {
    try {
      await prisma.scanResult.create({
        data: {
          userId,
          ebayItemId: result.ebayItemId,
          title: result.title,
          currentPrice: result.currentPrice,
          listingType: result.listingType,
          bidCount: result.bidCount,
          sellerName: result.sellerName,
          sellerFeedback: result.sellerFeedback,
          itemUrl: result.itemUrl,
          imageUrl: result.imageUrl,
          listingStartTime: result.listingStartTime,
          matchedPlayer: result.matchedPlayer,
          matchedDesc: result.matchedDesc,
        },
      });
      newCount++;
    } catch {
      // Unique constraint violation = duplicate, skip it
    }
  }

  // Send email if new results found
  if (newCount > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      const newResults = results.slice(0, newCount);
      await sendCardAlertEmail(user.email, newResults).catch((e) =>
        console.error("Email notification failed:", e)
      );
    }
  }

  // Update lastScanAt
  await prisma.subscription.updateMany({
    where: { userId },
    data: { lastScanAt: new Date() },
  });

  return { found: newCount };
}

export async function runCronScan() {
  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["active", "trialing"] },
    },
    include: { user: true },
  });

  let totalScanned = 0;
  let totalFound = 0;

  for (const sub of subscriptions) {
    // Check if enough time has passed since last scan
    if (sub.lastScanAt) {
      const elapsed = (now.getTime() - sub.lastScanAt.getTime()) / 60000;
      if (elapsed < sub.scanIntervalMinutes) continue;
    }

    try {
      console.log(`Scanning for user ${sub.user.email} (${sub.tier} tier)`);
      const result = await scanForUser(sub.userId, sub.scanIntervalMinutes);
      totalScanned++;
      totalFound += result.found;
    } catch (e) {
      console.error(`Scan failed for user ${sub.userId}:`, e);
    }
  }

  return { scanned: totalScanned, found: totalFound };
}
