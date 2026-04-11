import { prisma } from "./db";
import { rateLimit } from "./rate-limit";

const SCP_API_BASE = "https://www.sportscardspro.com/api";
const CACHE_DAYS = 7;

export interface MarketPrices {
  productName: string | null;
  scpProductId: string | null;
  ungraded: number | null;
  psa9: number | null;
  psa10: number | null;
}

function normalizeSearchKey(player: string, desc: string): string {
  return `${player} ${desc}`.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Search SportsCardsPro for market prices.
 * Checks cache first (7-day TTL), only calls API on cache miss.
 * Gracefully returns null if SCP_API_KEY is not configured.
 */
export async function getMarketPrices(
  playerName: string,
  cardDescription: string
): Promise<MarketPrices | null> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return null;

  const searchKey = normalizeSearchKey(playerName, cardDescription);

  // Check cache
  try {
    const cached = await prisma.marketPriceCache.findUnique({
      where: { searchKey },
    });

    if (cached) {
      const age = (Date.now() - cached.fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (age < CACHE_DAYS) {
        return {
          productName: cached.productName,
          scpProductId: cached.scpProductId,
          ungraded: cached.ungraded,
          psa9: cached.psa9,
          psa10: cached.psa10,
        };
      }
    }
  } catch (e) {
    console.error("[SCP] Cache read error:", e);
  }

  // Rate limit: 1 call per second
  const { allowed } = await rateLimit(`scp-api`);
  if (!allowed) {
    console.warn("[SCP] Rate limited, skipping");
    return null;
  }

  // Call SCP API
  try {
    const query = `${playerName} ${cardDescription}`;
    const resp = await fetch(
      `${SCP_API_BASE}/products?t=${apiKey}&q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!resp.ok) {
      console.error(`[SCP] API error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const products = data.products || [];

    if (!products.length) {
      // Cache the miss so we don't keep querying
      await prisma.marketPriceCache.upsert({
        where: { searchKey },
        create: { searchKey, fetchedAt: new Date() },
        update: { fetchedAt: new Date() },
      }).catch(() => {});
      return null;
    }

    // Take the first (best match) product
    const product = products[0];

    // SCP returns prices in pennies (integer)
    const pennies = (val: unknown): number | null => {
      if (val === null || val === undefined || val === "" || val === "0") return null;
      const num = Number(val);
      return isNaN(num) || num === 0 ? null : num / 100;
    };

    const prices: MarketPrices = {
      productName: product["product-name"] || null,
      scpProductId: String(product.id || ""),
      ungraded: pennies(product["loose-price"]),          // Raw/Ungraded
      psa9: pennies(product["graded-price"]),              // Grade 9
      psa10: pennies(product["manual-only-price"]),        // PSA 10
    };

    // Cache the result
    await prisma.marketPriceCache.upsert({
      where: { searchKey },
      create: {
        searchKey,
        scpProductId: prices.scpProductId,
        productName: prices.productName,
        ungraded: prices.ungraded,
        psa9: prices.psa9,
        psa10: prices.psa10,
        fetchedAt: new Date(),
      },
      update: {
        scpProductId: prices.scpProductId,
        productName: prices.productName,
        ungraded: prices.ungraded,
        psa9: prices.psa9,
        psa10: prices.psa10,
        fetchedAt: new Date(),
      },
    }).catch((e) => console.error("[SCP] Cache write error:", e));

    console.log(`[SCP] Fetched prices for "${query}": raw=$${prices.ungraded}, PSA10=$${prices.psa10}`);
    return prices;
  } catch (e) {
    console.error("[SCP] API error:", e);
    return null;
  }
}

/**
 * Refresh all cached market prices older than CACHE_DAYS.
 * Called by the weekly cron job.
 */
export async function refreshMarketPrices(): Promise<number> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return 0;

  const cutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000);
  const stale = await prisma.marketPriceCache.findMany({
    where: { fetchedAt: { lt: cutoff } },
    take: 100, // Process 100 at a time
  });

  let refreshed = 0;
  for (const entry of stale) {
    const parts = entry.searchKey.split(" ");
    // Try to split back into player + description (best effort)
    const player = parts.slice(0, 2).join(" ");
    const desc = parts.slice(2).join(" ");

    const result = await getMarketPrices(player, desc);
    if (result) refreshed++;

    // Respect rate limit
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`[SCP] Refreshed ${refreshed}/${stale.length} market prices`);
  return refreshed;
}
