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
}

function normalizeQuery(player: string, desc: string): string {
  return `${player} ${desc}`.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Score how well an SCP product matches our query.
 *
 * Matches tokens against BOTH the product name ("Jaxson Dart [Silver] #332")
 * and the set name ("Football Cards 2025 Panini Prizm"). SCP splits these
 * into separate fields, but users search with combined terms like
 * "Jaxson Dart Silver Prizm" where "Prizm" is the set, not the product.
 *
 * Gate: product must contain at least one player name token (hard reject → 0).
 * Last name match floors the score at 0.5.
 */
function scoreConfidence(
  queryTokens: string[],
  productName: string,
  setName: string,
  playerTokens: string[]
): number {
  // Score against combined product name + set name
  const combined = `${productName} ${setName}`.toLowerCase();

  const hasAnyPlayerToken = playerTokens.some((t) => combined.includes(t));
  if (!hasAnyPlayerToken) return 0;

  const meaningful = queryTokens.filter((t) => t.length >= 2);
  if (!meaningful.length) return 0;
  const matched = meaningful.filter((t) => combined.includes(t)).length;
  let score = matched / meaningful.length;

  const lastName = playerTokens.at(-1) ?? "";
  if (lastName && combined.includes(lastName)) {
    score = Math.max(score, 0.5);
  }

  return score;
}

/** TTL in ms based on confidence score */
function getTtlMs(confidenceScore: number): number {
  if (confidenceScore > 0.9) return 7 * 24 * 60 * 60 * 1000;   // 7 days
  if (confidenceScore > 0.75) return 24 * 60 * 60 * 1000;       // 1 day
  return 15 * 60 * 1000;                                          // 15 minutes
}

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

    // ── 3. Score and pick the single best match ────────────────────────────
    const queryTokens = query.split(/\s+/);
    const playerTokens = playerName.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

    const comps: Comp[] = products.map((p) => ({
      productId: String(p.id ?? ""),
      productName: String(p["product-name"] ?? ""),
      confidence: scoreConfidence(
        queryTokens,
        String(p["product-name"] ?? ""),
        String(p["console-name"] ?? ""),
        playerTokens
      ),
      ungraded: pennies(p["loose-price"]),
      psa9: pennies(p["graded-price"]),
      psa10: pennies(p["manual-only-price"]),
    }));

    // Pick the single highest-confidence match that has a price
    const bestMatch = comps
      .filter((c) => c.confidence > 0.4 && c.ungraded !== null)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (!bestMatch) {
      console.log(`[SCP] No match for "${rawQuery}" — ${comps.length} results, none scored > 0.4 with price`);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: { query, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 4. Use best match's prices directly ────────────────────────────────
    const finalPrice = bestMatch.ungraded!;
    const expiresAt = new Date(Date.now() + getTtlMs(bestMatch.confidence));

    // Cache as single-comp array (best match first)
    const pricesJson = JSON.parse(JSON.stringify([bestMatch]));
    await prisma.marketPriceCache.upsert({
      where: { query },
      create: {
        query, prices: pricesJson, finalPrice,
        confidenceScore: bestMatch.confidence,
        source: "scp", expiresAt, lastValidatedAt: new Date(),
      },
      update: {
        prices: pricesJson, finalPrice,
        confidenceScore: bestMatch.confidence,
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
