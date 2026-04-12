import { prisma } from "./db";
import {
  runUserScan,
  searchEbayWithCache,
  normalizeKeywords,
  purgeExpiredCache,
  type EbaySearchQuery,
  type EbayResult,
} from "./ebay";
import { sendCardAlertEmail } from "./email";
import { sendPushNotifications } from "./push";
import { getMarketPrices } from "./sportscardspro";

/**
 * Scan for a single user (used by manual "Scan Now" button).
 * Benefits from the shared cache automatically via searchEbay().
 */
export async function scanForUser(userId: string, lookbackMinutes: number) {
  const entries = await prisma.watchlistEntry.findMany({
    where: { userId },
  });

  if (!entries.length) return { found: 0 };

  const queries: EbaySearchQuery[] = entries.map((e) => ({
    playerName: e.playerName,
    cardDescription: e.cardDescription,
    maxPrice: e.maxPrice,
    minPrice: e.minPrice,
    listingType: e.listingType,
    condition: e.condition,
  }));

  // Look back 24 hours to ensure no listings are missed
  // Duplicates are handled by the unique constraint on (userId, ebayItemId)
  const results = await runUserScan(queries, 1440);
  const newCount = await saveResultsForUser(userId, results);

  // Update lastScanAt
  await prisma.subscription.updateMany({
    where: { userId },
    data: { lastScanAt: new Date() },
  });

  return { found: newCount };
}

/**
 * Save scan results for a user, send email if new ones found.
 * Returns count of new (non-duplicate) results saved.
 */
async function saveResultsForUser(
  userId: string,
  results: EbayResult[]
): Promise<number> {
  let newCount = 0;
  const newResults: EbayResult[] = [];

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
      newResults.push(result);
    } catch {
      // Unique constraint violation = duplicate, skip
    }
  }

  if (newCount > 0) {
    // Enrich results with cached market prices (no extra API calls if already cached)
    const enrichedResults = await Promise.all(
      newResults.map(async (r) => {
        const market = await getMarketPrices(r.matchedPlayer, r.matchedDesc, r.title).catch(() => null);
        return {
          ...r,
          marketUngraded: market?.ungraded ?? null,
          marketUngradedMin: market?.ungradedMin ?? null,
          marketUngradedMax: market?.ungradedMax ?? null,
          marketPsa10: market?.psa10 ?? null,
          marketPsa10Min: market?.psa10Min ?? null,
          marketPsa10Max: market?.psa10Max ?? null,
          marketCompCount: market?.compCount ?? 0,
        };
      })
    );

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendCardAlertEmail(user.email, enrichedResults).catch((e) =>
        console.error("Email notification failed:", e)
      );
    }

    // Send push notifications
    await sendPushNotifications(userId, newResults).catch((e) =>
      console.error("Push notification failed:", e)
    );
  }

  return newCount;
}

/**
 * Batched cron scan — deduplicates keyword searches across all users.
 *
 * Phase 1: Collect all users due for scanning + their watchlist entries
 * Phase 2: Warm cache with one API call per unique keyword pair
 * Phase 3: Distribute cached results to each user (with per-user maxPrice filter)
 * Phase 4: Purge expired cache entries
 */
export async function runCronScan() {
  const now = new Date();

  // Phase 1: Find users due for a scan
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["active", "trialing"] },
    },
    include: { user: true },
  });

  const dueUsers: {
    userId: string;
    email: string;
    scanIntervalMinutes: number;
    entries: EbaySearchQuery[];
  }[] = [];

  // Collect unique keyword pairs and the max lookback needed for each
  const keywordLookback = new Map<string, { playerName: string; cardDescription: string; maxLookback: number }>();

  for (const sub of subscriptions) {
    if (sub.lastScanAt) {
      const elapsed = (now.getTime() - sub.lastScanAt.getTime()) / 60000;
      if (elapsed < sub.scanIntervalMinutes) continue;
    }

    const entries = await prisma.watchlistEntry.findMany({
      where: { userId: sub.userId },
    });

    if (!entries.length) {
      // No watchlist entries, just update lastScanAt
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastScanAt: now },
      });
      continue;
    }

    const queries: EbaySearchQuery[] = entries.map((e) => ({
      playerName: e.playerName,
      cardDescription: e.cardDescription,
      maxPrice: e.maxPrice,
      minPrice: e.minPrice,
      listingType: e.listingType,
      condition: e.condition,
    }));

    dueUsers.push({
      userId: sub.userId,
      email: sub.user.email,
      scanIntervalMinutes: sub.scanIntervalMinutes,
      entries: queries,
    });

    // Track unique keywords with max lookback
    for (const entry of entries) {
      const key = normalizeKeywords(entry.playerName, entry.cardDescription);
      const existing = keywordLookback.get(key);
      if (!existing || sub.scanIntervalMinutes > existing.maxLookback) {
        keywordLookback.set(key, {
          playerName: entry.playerName,
          cardDescription: entry.cardDescription,
          maxLookback: sub.scanIntervalMinutes,
        });
      }
    }
  }

  if (!dueUsers.length) {
    return { scanned: 0, found: 0, apiCalls: 0, cacheHits: 0 };
  }

  // Phase 2: Warm cache — one API call per unique keyword pair
  let apiCalls = 0;
  let cacheHits = 0;

  console.log(
    `[Cron] ${dueUsers.length} users due, ${keywordLookback.size} unique keyword pairs`
  );

  for (const [key, { playerName, cardDescription, maxLookback }] of keywordLookback) {
    try {
      const { fromCache } = await searchEbayWithCache(
        playerName,
        cardDescription,
        maxLookback
      );
      if (fromCache) {
        cacheHits++;
      } else {
        apiCalls++;
        // Rate limit between actual API calls
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(`[Cron] Cache warm failed for "${key}":`, e);
    }
  }

  console.log(
    `[Cron] Cache warmed: ${apiCalls} API calls, ${cacheHits} cache hits`
  );

  // Phase 3: Distribute results to each user
  let totalScanned = 0;
  let totalFound = 0;

  for (const user of dueUsers) {
    try {
      // Use runUserScan which goes through cache (all should be cache hits now)
      const results = await runUserScan(user.entries, user.scanIntervalMinutes);
      const newCount = await saveResultsForUser(user.userId, results);

      await prisma.subscription.updateMany({
        where: { userId: user.userId },
        data: { lastScanAt: now },
      });

      totalScanned++;
      totalFound += newCount;
    } catch (e) {
      console.error(`[Cron] Scan failed for user ${user.email}:`, e);
    }
  }

  // Phase 4: Cleanup
  await purgeExpiredCache().catch((e) =>
    console.error("[Cron] Cache purge failed:", e)
  );

  console.log(
    `[Cron] Complete: ${totalScanned} users scanned, ${totalFound} new results, ${apiCalls} API calls`
  );

  return { scanned: totalScanned, found: totalFound, apiCalls, cacheHits };
}
