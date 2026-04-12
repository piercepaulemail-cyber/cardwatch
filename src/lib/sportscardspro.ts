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
 * Score a product name against query tokens.
 * Returns fraction of meaningful tokens (len >= 2) found in the product name.
 */
function scoreConfidence(queryTokens: string[], productName: string): number {
  const meaningful = queryTokens.filter((t) => t.length >= 2);
  if (!meaningful.length) return 0;
  const nameLower = productName.toLowerCase();
  const matched = meaningful.filter((t) => nameLower.includes(t)).length;
  return matched / meaningful.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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
 * Search SportsCardsPro for market prices.
 *
 * Flow:
 *   1. Check cache — return if not expired
 *   2. Fetch SCP products
 *   3. Score each product for query confidence
 *   4. Filter comps with confidence > 0.7
 *   5. Calculate median finalPrice
 *   6. Outlier protection: if new price differs from cached > 40%, keep old
 *   7. Set dynamic TTL (7d / 1d / 15m) based on confidence
 *   8. Upsert cache
 */
export async function getMarketPrices(
  playerName: string,
  cardDescription: string
): Promise<MarketPrices | null> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return null;

  const query = normalizeQuery(playerName, cardDescription);

  // ── 1. Cache check ─────────────────────────────────────────────────────────
  try {
    const cached = await prisma.marketPriceCache.findUnique({
      where: { query },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Increment hit counter (fire-and-forget)
      prisma.marketPriceCache
        .update({ where: { query }, data: { hitCount: { increment: 1 } } })
        .catch(() => {});

      const comps = cached.prices as unknown as Comp[];
      const validComps = comps.filter((c) => c.confidence > 0.7);
      const compsForPrice = validComps.length ? validComps : comps;
      const cachedUngradedPrices = compsForPrice.map((c) => c.ungraded).filter((v): v is number => v !== null);
      const cachedPsa10Prices = compsForPrice.map((c) => c.psa10).filter((v): v is number => v !== null);
      const best = comps.find((c) => c.confidence === Math.max(...comps.map((x) => x.confidence))) ?? comps[0];
      return {
        productName: best?.productName ?? null,
        scpProductId: best?.productId ?? null,
        ungraded: cached.finalPrice,
        ungradedMin: cachedUngradedPrices.length ? Math.min(...cachedUngradedPrices) : null,
        ungradedMax: cachedUngradedPrices.length ? Math.max(...cachedUngradedPrices) : null,
        psa10: best?.psa10 ?? null,
        psa10Min: cachedPsa10Prices.length ? Math.min(...cachedPsa10Prices) : null,
        psa10Max: cachedPsa10Prices.length ? Math.max(...cachedPsa10Prices) : null,
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
      // Cache miss so we don't keep querying (15-min TTL)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: {
          query,
          prices: JSON.parse(JSON.stringify([])),
          finalPrice: 0,
          confidenceScore: 0,
          source: "scp",
          expiresAt,
        },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 3 & 4. Score and filter comps ──────────────────────────────────────
    const queryTokens = query.split(/\s+/);
    const comps: Comp[] = products.map((p) => ({
      productId: String(p.id ?? ""),
      productName: String(p["product-name"] ?? ""),
      confidence: scoreConfidence(queryTokens, String(p["product-name"] ?? "")),
      ungraded: pennies(p["loose-price"]),
      psa9: pennies(p["graded-price"]),
      psa10: pennies(p["manual-only-price"]),
    }));

    const validComps = comps.filter((c) => c.confidence > 0.7);
    const compsForPrice = validComps.length ? validComps : comps; // fall back to all if none pass

    // ── 5. Median final price and ranges ──────────────────────────────────
    const ungradedPrices = compsForPrice
      .map((c) => c.ungraded)
      .filter((v): v is number => v !== null);
    const psa10Prices = compsForPrice
      .map((c) => c.psa10)
      .filter((v): v is number => v !== null);

    if (!ungradedPrices.length) {
      // Cache the miss
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const compsJson = JSON.parse(JSON.stringify(comps));
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: { query, prices: compsJson, finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: compsJson, finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    let finalPrice = median(ungradedPrices);

    // ── 6. Outlier protection ───────────────────────────────────────────────
    if (cached) {
      const oldPrice = cached.finalPrice;
      if (oldPrice > 0) {
        const pctChange = Math.abs(finalPrice - oldPrice) / oldPrice;
        if (pctChange > 0.4) {
          console.log(`[SCP] Outlier detected for "${query}": $${finalPrice.toFixed(2)} vs cached $${oldPrice.toFixed(2)} (${(pctChange * 100).toFixed(0)}% change) — keeping old price`);
          finalPrice = oldPrice;
        }
      }
    }

    // ── 7. Dynamic TTL ─────────────────────────────────────────────────────
    const avgConfidence =
      validComps.length > 0
        ? validComps.reduce((s, c) => s + c.confidence, 0) / validComps.length
        : comps.reduce((s, c) => s + c.confidence, 0) / comps.length;

    const expiresAt = new Date(Date.now() + getTtlMs(avgConfidence));

    // ── 8. Upsert cache ─────────────────────────────────────────────────────
    const pricesJson = JSON.parse(JSON.stringify(validComps.length ? validComps : comps));
    await prisma.marketPriceCache.upsert({
      where: { query },
      create: {
        query,
        prices: pricesJson,
        finalPrice,
        confidenceScore: avgConfidence,
        source: "scp",
        expiresAt,
        lastValidatedAt: new Date(),
      },
      update: {
        prices: pricesJson,
        finalPrice,
        confidenceScore: avgConfidence,
        expiresAt,
        lastValidatedAt: new Date(),
      },
    }).catch((e) => console.error("[SCP] Cache write error:", e));

    // Pick the best comp for psa9/psa10
    const bestComp =
      (validComps.length ? validComps : comps).reduce(
        (best, c) => (c.confidence > best.confidence ? c : best),
        (validComps.length ? validComps : comps)[0]
      );

    console.log(
      `[SCP] "${rawQuery}" → ${validComps.length}/${comps.length} valid comps, ` +
        `median=$${finalPrice.toFixed(2)}, confidence=${avgConfidence.toFixed(2)}, ` +
        `TTL=${Math.round(getTtlMs(avgConfidence) / 60000)}m`
    );

    return {
      productName: bestComp.productName,
      scpProductId: bestComp.productId,
      ungraded: finalPrice,
      ungradedMin: ungradedPrices.length ? Math.min(...ungradedPrices) : null,
      ungradedMax: ungradedPrices.length ? Math.max(...ungradedPrices) : null,
      psa10: bestComp.psa10,
      psa10Min: psa10Prices.length ? Math.min(...psa10Prices) : null,
      psa10Max: psa10Prices.length ? Math.max(...psa10Prices) : null,
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
