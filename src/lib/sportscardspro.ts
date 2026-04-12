import { prisma } from "./db";

const SCP_API_BASE = "https://www.sportscardspro.com/api";

export interface MarketPrices {
  productName: string | null;
  scpProductId: string | null;
  ungraded: number | null;
  ungradedMin: number | null;
  ungradedMax: number | null;
  psa10: number | null;
  psa10Min: number | null;
  psa10Max: number | null;
  compCount: number;
}

interface Comp {
  productId: string;
  productName: string;
  confidence: number;
  ungraded: number | null;
  psa9: number | null;
  psa10: number | null;
  _hasPlayer?: boolean;
}

function normalizeQuery(player: string, desc: string): string {
  return `${player} ${desc}`.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Cache TTL: 24 hours for all SCP data */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** SCP cents-to-dollars conversion */
function pennies(val: unknown): number | null {
  if (val === null || val === undefined || val === "" || val === "0") return null;
  const num = Number(val);
  return isNaN(num) || num === 0 ? null : num / 100;
}

/**
 * Get market prices from SportsCardsPro.
 *
 * Simple approach: find the single best-matching SCP product and use its
 * prices directly. No averaging across multiple products — each SCP product
 * represents a specific card, and mixing them creates inaccurate ranges.
 */
export async function getMarketPrices(
  playerName: string,
  cardDescription: string
): Promise<MarketPrices | null> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return null;

  const query = normalizeQuery(playerName, cardDescription);

  try {
    // ── 1. Cache check ─────────────────────────────────────────────────────
    const cached = await prisma.marketPriceCache.findUnique({
      where: { query },
    });

    if (cached && cached.expiresAt > new Date()) {
      prisma.marketPriceCache
        .update({ where: { query }, data: { hitCount: { increment: 1 } } })
        .catch(() => {});

      const comps = cached.prices as unknown as Comp[];
      if (!comps.length || cached.finalPrice === 0) return null;

      const best = comps[0]; // best match is always first
      return {
        productName: best.productName,
        scpProductId: best.productId,
        ungraded: best.ungraded,
        ungradedMin: best.ungraded,
        ungradedMax: best.ungraded,
        psa10: best.psa10,
        psa10Min: best.psa10,
        psa10Max: best.psa10,
        compCount: 1,
      };
    }

    // ── 2. Fetch from SCP ───────────────────────────────────────────────────
    const rawQuery = `${playerName} ${cardDescription}`;
    const resp = await fetch(
      `${SCP_API_BASE}/products?t=${apiKey}&q=${encodeURIComponent(rawQuery)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!resp.ok) {
      console.error(`[SCP] API error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const products: Record<string, unknown>[] = data.products ?? [];

    if (!products.length) {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: { query, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 3. Find the first SCP result for this player that has a price ────
    // SCP ranks by relevance, but for generic terms like "Downtown" it may
    // return a different player's card first. So we check that the player's
    // last name appears in the product name or set name.
    const lastName = playerName.toLowerCase().split(/\s+/).filter((t) => t.length >= 2).at(-1) ?? "";

    const comps: Comp[] = products.map((p) => {
      const combined = `${String(p["product-name"] ?? "")} ${String(p["console-name"] ?? "")}`.toLowerCase();
      return {
        productId: String(p.id ?? ""),
        productName: String(p["product-name"] ?? ""),
        confidence: 1,
        ungraded: pennies(p["loose-price"]),
        psa9: pennies(p["graded-price"]),
        psa10: pennies(p["manual-only-price"]),
        _hasPlayer: lastName ? combined.includes(lastName) : true,
      };
    });

    // First try: player name match + has price. Fallback: any result with price.
    const bestMatch =
      comps.find((c) => c._hasPlayer && c.ungraded !== null) ??
      comps.find((c) => c.ungraded !== null);

    if (!bestMatch) {
      console.log(`[SCP] No priced result for "${rawQuery}" — ${comps.length} results, none had a price`);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: { query, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 4. Use this product's prices directly ──────────────────────────────
    const finalPrice = bestMatch.ungraded!;
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

    // Cache as single-comp array (best match first)
    const pricesJson = JSON.parse(JSON.stringify([bestMatch]));
    await prisma.marketPriceCache.upsert({
      where: { query },
      create: {
        query, prices: pricesJson, finalPrice,
        confidenceScore: 1,
        source: "scp", expiresAt, lastValidatedAt: new Date(),
      },
      update: {
        prices: pricesJson, finalPrice,
        confidenceScore: 1,
        expiresAt, lastValidatedAt: new Date(),
      },
    }).catch((e) => console.error("[SCP] Cache write error:", e));

    console.log(
      `[SCP] "${rawQuery}" → best="${bestMatch.productName}" raw=$${finalPrice.toFixed(2)} ` +
        `psa10=${bestMatch.psa10 ? `$${bestMatch.psa10.toFixed(2)}` : "n/a"} ` +
        `confidence=${bestMatch.confidence.toFixed(2)}`
    );

    return {
      productName: bestMatch.productName,
      scpProductId: bestMatch.productId,
      ungraded: finalPrice,
      ungradedMin: finalPrice,
      ungradedMax: finalPrice,
      psa10: bestMatch.psa10,
      psa10Min: bestMatch.psa10,
      psa10Max: bestMatch.psa10,
      compCount: 1,
    };
  } catch (e) {
    console.error("[SCP] Error:", e);
    return null;
  }
}

/**
 * Refresh all expired cache entries.
 * Called by the weekly cron job.
 */
export async function refreshMarketPrices(): Promise<number> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return 0;

  const stale = await prisma.marketPriceCache.findMany({
    where: { expiresAt: { lt: new Date() } },
    take: 100,
  });

  let refreshed = 0;
  for (const entry of stale) {
    const parts = entry.query.split(" ");
    const player = parts.slice(0, 2).join(" ");
    const desc = parts.slice(2).join(" ");

    const result = await getMarketPrices(player, desc);
    if (result) refreshed++;

    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`[SCP] Refreshed ${refreshed}/${stale.length} market prices`);
  return refreshed;
}

/**
 * Clear all cached market prices so they get re-fetched fresh from SCP.
 */
export async function clearMarketPriceCache(): Promise<number> {
  const result = await prisma.marketPriceCache.deleteMany({});
  console.log(`[SCP] Cleared ${result.count} cached market prices`);
  return result.count;
}
