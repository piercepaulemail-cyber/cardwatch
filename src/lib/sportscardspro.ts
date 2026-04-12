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

/** Cache TTL: 24 hours */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** SCP cents-to-dollars conversion */
function pennies(val: unknown): number | null {
  if (val === null || val === undefined || val === "" || val === "0") return null;
  const num = Number(val);
  return isNaN(num) || num === 0 ? null : num / 100;
}

/**
 * Clean an eBay listing title into a good SCP search query.
 * Removes emojis, noise words, special chars — keeps the card info.
 */
function cleanTitle(title: string): string {
  return title
    // Strip emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA9F}\u{200D}\u{20E3}]/gu, "")
    // Strip special chars except /# (used for numbering like /299 or #332)
    .replace(/[!()[\]|*~_@&+=<>{}\\^`"']/g, " ")
    // Remove noise words sellers add
    .replace(/\b(NM|EX|VG|MT|MINT|GEM|NEAR MINT|PACK FRESH|CLEAN|HOT|FIRE|LOOK|WOW|RARE|L@@K|INVEST|SP|SSP|RC|ROOKIE|CARD|CARDS|SEE|PICS|DETAILS|LOT|CASE|HIT|SHIPPING|FREE|FAST|NEW|LISTING|FOR|THE|AND|OR)\b/gi, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get market prices from SportsCardsPro.
 *
 * Uses the eBay listing title as the SCP search query — this is the most
 * specific description of the card and matches what you'd type into SCP
 * yourself. Each listing gets its own cached price.
 *
 * Falls back to playerName + cardDescription if no title is provided.
 */
export async function getMarketPrices(
  playerName: string,
  cardDescription: string,
  ebayTitle?: string
): Promise<MarketPrices | null> {
  const apiKey = process.env.SCP_API_KEY;
  if (!apiKey) return null;

  // Use the eBay title as the search query when available — it's the most
  // specific description of the card. Fall back to watchlist terms.
  const searchQuery = ebayTitle ? cleanTitle(ebayTitle) : `${playerName} ${cardDescription}`;
  const cacheKey = searchQuery.toLowerCase().trim().replace(/\s+/g, " ");

  try {
    // ── 1. Cache check ─────────────────────────────────────────────────────
    const cached = await prisma.marketPriceCache.findUnique({
      where: { query: cacheKey },
    });

    if (cached && cached.expiresAt > new Date()) {
      prisma.marketPriceCache
        .update({ where: { query: cacheKey }, data: { hitCount: { increment: 1 } } })
        .catch(() => {});

      const comps = cached.prices as unknown as Comp[];
      if (!comps.length || cached.finalPrice === 0) return null;

      const best = comps[0];
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

    // ── 2. Fetch from SCP using the listing title ──────────────────────────
    console.log(`[SCP] Searching: "${searchQuery}"`);
    const resp = await fetch(
      `${SCP_API_BASE}/products?t=${apiKey}&q=${encodeURIComponent(searchQuery)}`,
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
        where: { query: cacheKey },
        create: { query: cacheKey, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 3. Pick the best result ──────────────────────────────────────────
    // Prefer results where the product name doesn't have extra words absent
    // from the search query. This avoids picking "Abdul Carter [Oversized]"
    // when the listing is just "Abdul Carter Downtown".
    const lastName = playerName.toLowerCase().split(/\s+/).filter((t) => t.length >= 2).at(-1) ?? "";
    const queryWords = new Set(searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2));

    const comps = products.map((p) => {
      const productName = String(p["product-name"] ?? "");
      const setName = String(p["console-name"] ?? "");
      const combined = `${productName} ${setName}`.toLowerCase();
      const hasPlayer = lastName ? combined.includes(lastName) : true;

      // Count words in product name NOT present in search query — fewer extras = better match
      const productWords = productName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2);
      const extraWords = productWords.filter((w) => !queryWords.has(w)).length;

      return {
        productId: String(p.id ?? ""),
        productName,
        confidence: 1,
        ungraded: pennies(p["loose-price"]),
        psa9: pennies(p["graded-price"]),
        psa10: pennies(p["manual-only-price"]),
        _hasPlayer: hasPlayer,
        _extraWords: extraWords,
      };
    });

    // Filter to player matches with prices, then pick the one with fewest extra words
    const candidates = comps.filter((c) => c._hasPlayer && c.ungraded !== null);
    candidates.sort((a, b) => a._extraWords - b._extraWords);

    const bestMatch = candidates[0] ?? comps.find((c) => c.ungraded !== null);

    if (!bestMatch) {
      console.log(`[SCP] No priced result for "${searchQuery}"`);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.marketPriceCache.upsert({
        where: { query: cacheKey },
        create: { query: cacheKey, prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, source: "scp", expiresAt },
        update: { prices: JSON.parse(JSON.stringify([])), finalPrice: 0, confidenceScore: 0, expiresAt },
      }).catch(() => {});
      return null;
    }

    // ── 4. Use this product's prices directly ──────────────────────────────
    const finalPrice = bestMatch.ungraded!;
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

    const pricesJson = JSON.parse(JSON.stringify([bestMatch]));
    await prisma.marketPriceCache.upsert({
      where: { query: cacheKey },
      create: {
        query: cacheKey, prices: pricesJson, finalPrice,
        confidenceScore: 1, source: "scp", expiresAt, lastValidatedAt: new Date(),
      },
      update: {
        prices: pricesJson, finalPrice, confidenceScore: 1,
        expiresAt, lastValidatedAt: new Date(),
      },
    }).catch((e) => console.error("[SCP] Cache write error:", e));

    console.log(
      `[SCP] "${searchQuery}" → "${bestMatch.productName}" raw=$${finalPrice.toFixed(2)} ` +
        `psa10=${bestMatch.psa10 ? `$${bestMatch.psa10.toFixed(2)}` : "n/a"}`
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
