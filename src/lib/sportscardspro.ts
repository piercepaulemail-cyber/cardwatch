import { prisma } from "./db";
import { getEbaySoldPrices } from "./ebay";

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
 * Score a product name against query tokens.
 *
 * Gate: product must contain at least one player name token (hard reject → 0).
 * Last name match floors the score at 0.5 — SCP often uses abbreviated first
 * names ("T. McMillan") so requiring the full name is too aggressive.
 * Returns fraction of all meaningful tokens (len >= 2) found in the product name.
 */
/** Noise words to ignore when extracting supplemental tokens from eBay titles */
const TITLE_NOISE = new Set([
  "new", "listing", "nm", "mint", "look", "hot", "rare", "sp", "ssp",
  "rc", "rookie", "card", "cards", "the", "and", "for", "psa", "bgs",
  "sgc", "see", "pics", "details", "lot", "case", "hit", "invest",
  "shipping", "free", "fast", "🔥", "💎", "⭐",
]);

/**
 * Extract meaningful tokens from an eBay title that aren't already in the
 * base query. These help distinguish variations (e.g., "optic" vs "donruss",
 * "black pandora" parallel, specific year/brand).
 */
function extractSupplementalTokens(
  ebayTitle: string,
  existingTokens: string[]
): string[] {
  const existing = new Set(existingTokens);
  return ebayTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 2 &&
        !existing.has(t) &&
        !TITLE_NOISE.has(t) &&
        !/^\d{1}$/.test(t)
    );
}

function scoreConfidence(
  queryTokens: string[],
  productName: string,
  playerTokens: string[],
  bonusTokens: string[] = []
): number {
  const nameLower = productName.toLowerCase();

  // Hard reject: must have at least one player token match.
  // Using "every" was too strict — SCP often abbreviates first names.
  const hasAnyPlayerToken = playerTokens.some((t) => nameLower.includes(t));
  if (!hasAnyPlayerToken) return 0;

  const meaningful = queryTokens.filter((t) => t.length >= 2);
  if (!meaningful.length) return 0;
  const matched = meaningful.filter((t) => nameLower.includes(t)).length;
  let score = matched / meaningful.length;

  // Last name is the most reliable identifier. If it matches, guarantee at
  // least 0.5 even when set/year tokens aren't in the SCP product name field.
  const lastName = playerTokens.at(-1) ?? "";
  if (lastName && nameLower.includes(lastName)) {
    score = Math.max(score, 0.5);
  }

  // Bonus: reward SCP products that match specific tokens from the eBay title
  // (e.g., "optic", "prizm", "pandora", year). +0.05 per match, capped at +0.2.
  if (bonusTokens.length) {
    const bonusMatched = bonusTokens.filter((t) => nameLower.includes(t)).length;
    score += Math.min(bonusMatched * 0.05, 0.2);
  }

  return Math.min(score, 1);
}

/**
 * Return the 25th–75th percentile slice of values when max > 3× min,
 * preventing absurd ranges like $12–$13,750.
 */
function trimOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted[sorted.length - 1] <= sorted[0] * 3) return values;
  const lo = Math.floor(sorted.length * 0.25);
  const hi = Math.ceil(sorted.length * 0.75);
  return sorted.slice(lo, hi);
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

/** Return value at a given percentile (0–1) from a sorted array */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** SCP cents-to-dollars conversion */
function pennies(val: unknown): number | null {
  if (val === null || val === undefined || val === "" || val === "0") return null;
  const num = Number(val);
  return isNaN(num) || num === 0 ? null : num / 100;
}

/**
 * Get market prices using eBay sold listings as the primary source,
 * with SCP as fallback for PSA 10 values and when eBay has no data.
 *
 * Flow:
 *   1. Check cache — return if not expired
 *   2. Fetch eBay sold prices (actual sales from last 30 days)
 *   3. Fetch SCP for PSA 10 data (guide prices)
 *   4. Use eBay sold prices for raw range (real market data)
 *   5. Fall back to SCP for raw if eBay has no data
 *   6. Outlier protection against cached price
 *   7. Cache results with dynamic TTL
 */
export async function getMarketPrices(
  playerName: string,
  cardDescription: string,
  ebayTitle?: string
): Promise<MarketPrices | null> {
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

      const cachedUngradedPrices = comps.map((c) => c.ungraded).filter((v): v is number => v !== null);
      const cachedPsa10Prices = comps.map((c) => c.psa10).filter((v): v is number => v !== null);
      const best = comps.reduce((b, c) => (c.confidence > b.confidence ? c : b), comps[0]);

      return {
        productName: best?.productName ?? null,
        scpProductId: best?.productId ?? null,
        ungraded: cached.finalPrice,
        ungradedMin: cachedUngradedPrices.length ? Math.min(...cachedUngradedPrices) : null,
        ungradedMax: cachedUngradedPrices.length ? Math.max(...cachedUngradedPrices) : null,
        psa10: best?.psa10 ?? null,
        psa10Min: cachedPsa10Prices.length ? Math.min(...cachedPsa10Prices) : null,
        psa10Max: cachedPsa10Prices.length ? Math.max(...cachedPsa10Prices) : null,
        compCount: comps.length,
      };
    }

    // ── 2. Fetch eBay sold prices (primary source for raw prices) ──────────
    const ebaySoldPrices = await getEbaySoldPrices(playerName, cardDescription).catch(() => null);

    // ── 3. Fetch SCP for PSA 10 data and as fallback ──────────────────────
    const scpResult = await fetchScpComps(playerName, cardDescription, ebayTitle);

    // ── 4. Build ranges from eBay sold data (preferred) or SCP (fallback) ─
    let rawPrices: number[];
    let source: string;

    if (ebaySoldPrices && ebaySoldPrices.length >= 2) {
      // Use eBay sold prices — real market data
      rawPrices = ebaySoldPrices;
      source = "ebay";
      console.log(`[Market] "${playerName} ${cardDescription}" — using ${rawPrices.length} eBay sold prices`);
    } else if (scpResult && scpResult.ungradedPrices.length > 0) {
      // Fall back to SCP guide prices
      rawPrices = scpResult.ungradedPrices;
      source = "scp";
      console.log(`[Market] "${playerName} ${cardDescription}" — falling back to ${rawPrices.length} SCP prices (eBay had ${ebaySoldPrices?.length ?? 0} results)`);
    } else {
      // No data from either source — cache the miss
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query },
        create: { query, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "none", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // Trim outliers and compute ranges
    const trimmed = trimOutliers(rawPrices);
    let finalPrice = median(trimmed);
    const compCount = trimmed.length;
    const rawMin = Math.min(...trimmed);
    const rawMax = Math.max(...trimmed);

    // PSA 10 from SCP (eBay sold doesn't easily distinguish grades)
    const psa10 = scpResult?.bestPsa10 ?? null;
    const psa10Min = scpResult?.psa10Prices.length
      ? Math.min(...scpResult.psa10Prices) : null;
    const psa10Max = scpResult?.psa10Prices.length
      ? Math.max(...scpResult.psa10Prices) : null;

    // ── 5. Outlier protection ──────────────────────────────────────────────
    if (cached && cached.finalPrice > 0) {
      const pctChange = Math.abs(finalPrice - cached.finalPrice) / cached.finalPrice;
      if (pctChange > 0.4) {
        console.log(`[Market] Outlier for "${query}": $${finalPrice.toFixed(2)} vs cached $${cached.finalPrice.toFixed(2)} (${(pctChange * 100).toFixed(0)}%) — keeping old`);
        finalPrice = cached.finalPrice;
      }
    }

    // ── 6. Cache results ───────────────────────────────────────────────────
    // Store trimmed prices as pseudo-comps for cache retrieval
    const compsForCache: Comp[] = trimmed.map((price, i) => ({
      productId: source === "ebay" ? `ebay-sold-${i}` : scpResult?.comps[i]?.productId ?? `scp-${i}`,
      productName: source === "ebay" ? `${playerName} ${cardDescription}` : scpResult?.comps[i]?.productName ?? "",
      confidence: source === "ebay" ? 1.0 : scpResult?.comps[i]?.confidence ?? 0.5,
      ungraded: price,
      psa9: null,
      psa10: i === 0 ? psa10 : null, // store PSA 10 on first entry only
    }));

    const ttl = source === "ebay" ? 24 * 60 * 60 * 1000 : getTtlMs(scpResult?.avgConfidence ?? 0.5);
    const expiresAt = new Date(Date.now() + ttl);
    const pricesJson = JSON.parse(JSON.stringify(compsForCache));

    await prisma.marketPriceCache.upsert({
      where: { query },
      create: {
        query, prices: pricesJson, finalPrice,
        confidenceScore: source === "ebay" ? 1.0 : scpResult?.avgConfidence ?? 0,
        source, expiresAt, lastValidatedAt: new Date(),
      },
      update: {
        prices: pricesJson, finalPrice,
        confidenceScore: source === "ebay" ? 1.0 : scpResult?.avgConfidence ?? 0,
        source, expiresAt, lastValidatedAt: new Date(),
      },
    }).catch((e) => console.error("[Market] Cache write error:", e));

    console.log(
      `[Market] "${playerName} ${cardDescription}" → $${rawMin.toFixed(0)}–$${rawMax.toFixed(0)} (${source}, ${compCount} comps), median=$${finalPrice.toFixed(0)}`
    );

    return {
      productName: compsForCache[0]?.productName ?? null,
      scpProductId: scpResult?.comps[0]?.productId ?? null,
      ungraded: finalPrice,
      ungradedMin: rawMin,
      ungradedMax: rawMax,
      psa10,
      psa10Min,
      psa10Max,
      compCount,
    };
  } catch (e) {
    console.error("[Market] Error:", e);
    return null;
  }
}

/**
 * Fetch and score SCP comps. Returns structured data for use by getMarketPrices.
 */
async function fetchScpComps(
  playerName: string,
  cardDescription: string,
  ebayTitle?: string
): Promise<{
  comps: Comp[];
  ungradedPrices: number[];
  psa10Prices: number[];
  bestPsa10: number | null;
  avgConfidence: number;
} | null> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return null;

  const query = normalizeQuery(playerName, cardDescription);
  const rawQuery = `${playerName} ${cardDescription}`;

  const resp = await fetch(
    `${SCP_API_BASE}/products?t=${apiKey}&q=${encodeURIComponent(rawQuery)}`,
    { signal: AbortSignal.timeout(10000) }
  ).catch(() => null);

  if (!resp || !resp.ok) return null;

  const data = await resp.json();
  const products: Record<string, unknown>[] = data.products ?? [];
  if (!products.length) return null;

  const queryTokens = query.split(/\s+/);
  const playerTokens = playerName.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const bonusTokens = ebayTitle ? extractSupplementalTokens(ebayTitle, queryTokens) : [];

  const comps: Comp[] = products.map((p) => ({
    productId: String(p.id ?? ""),
    productName: String(p["product-name"] ?? ""),
    confidence: scoreConfidence(queryTokens, String(p["product-name"] ?? ""), playerTokens, bonusTokens),
    ungraded: pennies(p["loose-price"]),
    psa9: pennies(p["graded-price"]),
    psa10: pennies(p["manual-only-price"]),
  }));

  const validComps = comps
    .filter((c) => c.confidence > 0.4)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  if (!validComps.length) return null;

  const ungradedPrices = validComps.map((c) => c.ungraded).filter((v): v is number => v !== null);
  const psa10Prices = validComps.map((c) => c.psa10).filter((v): v is number => v !== null);
  const bestComp = validComps[0];
  const avgConfidence = validComps.reduce((s, c) => s + c.confidence, 0) / validComps.length;

  return {
    comps: validComps,
    ungradedPrices,
    psa10Prices,
    bestPsa10: bestComp.psa10,
    avgConfidence,
  };
}

/**
 * Refresh all expired cache entries.
 * Called by the weekly cron job.
 */
export async function refreshMarketPrices(): Promise<number> {
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
