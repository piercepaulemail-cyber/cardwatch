import { prisma } from "./db";

const BROWSE_API_ENDPOINT =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";
const TOKEN_ENDPOINT = "https://api.ebay.com/identity/v1/oauth2/token";
const EPN_CAMPAIGN_ID = "5339148344";

/**
 * Append EPN affiliate tracking parameters to an eBay item URL.
 */
export function toAffiliateUrl(ebayUrl: string): string {
  if (!ebayUrl) return ebayUrl;
  try {
    const url = new URL(ebayUrl);
    url.searchParams.set("mkcid", "1");           // eBay Partner Network
    url.searchParams.set("mkrid", "711-53200-19255-0"); // US marketplace
    url.searchParams.set("campid", EPN_CAMPAIGN_ID);
    url.searchParams.set("toolid", "10001");
    url.searchParams.set("customid", "cardwatch");
    return url.toString();
  } catch {
    return ebayUrl;
  }
}
const SPORTS_CARDS_CATEGORY = "261328";
const CONDITION_UNGRADED = "4000";
const CACHE_TTL_MINUTES = 15;

let tokenCache: { token: string; expiresAt: number } = {
  token: "",
  expiresAt: 0,
};

async function getEbayToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (tokenCache.token && now < tokenCache.expiresAt - 60) {
    return tokenCache.token;
  }

  const appId = process.env.EBAY_APP_ID!;
  const certId = process.env.EBAY_CERT_ID!;
  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!resp.ok) {
    throw new Error(`eBay token error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 7200),
  };
  return tokenCache.token;
}

export interface EbaySearchQuery {
  playerName: string;
  cardDescription: string;
  maxPrice?: number | null;
  minPrice?: number | null;
  listingType?: string | null; // "all", "buyItNow", "auction"
  condition?: string | null;   // "ungraded", "nearMint", "excellent", "graded"
}

// eBay condition IDs for trading cards
const CONDITION_MAP: Record<string, string> = {
  ungraded: "4000",    // Ungraded
  nearMint: "4000",    // Ungraded - Near Mint (filtered client-side via descriptor)
  excellent: "4000",   // Ungraded - Excellent (filtered client-side via descriptor)
  graded: "2750",      // Graded (Like New)
};

export interface EbayResult {
  ebayItemId: string;
  title: string;
  currentPrice: number;
  listingType: string;
  bidCount: number;
  sellerName: string;
  sellerFeedback: number;
  itemUrl: string;
  imageUrl: string;
  listingStartTime: Date;
  matchedPlayer: string;
  matchedDesc: string;
  conditionId: string;
}

// --- Cache helpers ---

export function normalizeKeywords(
  playerName: string,
  cardDescription: string
): string {
  return `${playerName} ${cardDescription}`.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Search eBay with a shared cache layer.
 * Cache key is the normalized keywords (no maxPrice — that's applied per-user after).
 * Returns { results, fromCache } so callers can skip rate-limit delay on hits.
 */
export async function searchEbayWithCache(
  playerName: string,
  cardDescription: string,
  lookbackMinutes: number
): Promise<{ results: EbayResult[]; fromCache: boolean }> {
  const cacheKey = normalizeKeywords(playerName, cardDescription);
  const now = new Date();

  // Check cache
  try {
    const cached = await prisma.searchCache.findFirst({
      where: {
        cacheKey,
        expiresAt: { gt: now },
      },
    });

    if (cached) {
      console.log(`[Cache HIT] "${cacheKey}"`);
      const results: EbayResult[] = JSON.parse(cached.resultsJson).map(
        (r: EbayResult) => ({
          ...r,
          listingStartTime: new Date(r.listingStartTime),
        })
      );
      return { results, fromCache: true };
    }
  } catch (e) {
    console.error("Cache read error:", e);
  }

  // Cache miss — call eBay API (no maxPrice filter)
  console.log(`[Cache MISS] "${cacheKey}" — calling eBay API`);
  const results = await searchEbayRaw(playerName, cardDescription, lookbackMinutes);

  // Store in cache
  try {
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);
    await prisma.searchCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        resultsJson: JSON.stringify(results),
        expiresAt,
      },
      update: {
        resultsJson: JSON.stringify(results),
        expiresAt,
        createdAt: now,
      },
    });
  } catch (e) {
    console.error("Cache write error:", e);
  }

  return { results, fromCache: false };
}

/**
 * Raw eBay API call — no cache, no maxPrice filter.
 */
async function searchEbayRaw(
  playerName: string,
  cardDescription: string,
  lookbackMinutes: number
): Promise<EbayResult[]> {
  const token = await getEbayToken();
  const keywords = `${playerName} ${cardDescription}`;
  const cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  const filters = [
    `categoryId:${SPORTS_CARDS_CATEGORY}`,
    "buyingOptions:{AUCTION|FIXED_PRICE}",
  ];

  const params = new URLSearchParams({
    q: keywords,
    sort: "newlyListed",
    limit: "100",
    filter: filters.join(","),
  });

  const resp = await fetch(`${BROWSE_API_ENDPOINT}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`eBay search error for "${keywords}": ${resp.status} ${text}`);
    return [];
  }

  const data = await resp.json();
  const items = data.itemSummaries || [];

  const results: EbayResult[] = [];
  for (const item of items) {
    const originDate = item.itemCreationDate || item.itemEndDate || "";
    if (originDate) {
      try {
        const itemTime = new Date(originDate);
        if (itemTime < cutoffTime) continue;
      } catch {
        // skip time filter if date parsing fails
      }
    }

    const buyingOptions: string[] = item.buyingOptions || [];
    const listingType = buyingOptions.includes("AUCTION")
      ? "Auction"
      : "FixedPrice";

    results.push({
      ebayItemId: item.itemId || "",
      title: item.title || "",
      currentPrice: parseFloat(item.price?.value || "0"),
      listingType,
      bidCount: item.bidCount || 0,
      sellerName: item.seller?.username || "",
      sellerFeedback: item.seller?.feedbackScore || 0,
      itemUrl: toAffiliateUrl(item.itemWebUrl || ""),
      imageUrl: item.image?.imageUrl || "",
      listingStartTime: new Date(originDate || Date.now()),
      matchedPlayer: playerName,
      matchedDesc: cardDescription,
      conditionId: item.conditionId || item.condition?.conditionId || "",
    });
  }

  return results;
}

/**
 * Search eBay for one watchlist entry (used by manual scans).
 * Uses the shared cache, then applies maxPrice filter per-user.
 */
export async function searchEbay(
  query: EbaySearchQuery,
  lookbackMinutes: number
): Promise<{ results: EbayResult[]; fromCache: boolean }> {
  const { results, fromCache } = await searchEbayWithCache(
    query.playerName,
    query.cardDescription,
    lookbackMinutes
  );

  // Apply per-user filters after cache
  let filtered = results;

  if (query.maxPrice) {
    filtered = filtered.filter((r) => r.currentPrice <= query.maxPrice!);
  }
  if (query.minPrice) {
    filtered = filtered.filter((r) => r.currentPrice >= query.minPrice!);
  }
  if (query.listingType && query.listingType !== "all") {
    if (query.listingType === "buyItNow") {
      filtered = filtered.filter((r) => r.listingType === "FixedPrice");
    } else if (query.listingType === "auction") {
      filtered = filtered.filter((r) => r.listingType === "Auction");
    }
  }

  // Condition filter
  const cond = query.condition || "ungraded";
  if (cond === "graded") {
    filtered = filtered.filter((r) => r.conditionId === "2750");
  } else if (cond === "ungraded" || cond === "nearMint" || cond === "excellent") {
    filtered = filtered.filter((r) => r.conditionId === "4000" || r.conditionId === "");
  }

  return { results: filtered, fromCache };
}

/**
 * Run scans for a user's full watchlist. Deduplicates results.
 */
export async function runUserScan(
  queries: EbaySearchQuery[],
  lookbackMinutes: number
): Promise<EbayResult[]> {
  const allResults: EbayResult[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < queries.length; i++) {
    try {
      const { results, fromCache } = await searchEbay(queries[i], lookbackMinutes);
      for (const item of results) {
        if (!seenIds.has(item.ebayItemId)) {
          seenIds.add(item.ebayItemId);
          allResults.push(item);
        }
      }

      // Only delay between actual API calls, skip for cache hits
      if (!fromCache && i < queries.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(
        `Search failed for "${queries[i].playerName} ${queries[i].cardDescription}":`,
        e
      );
    }
  }

  return allResults;
}

/**
 * Purge expired cache entries. Call periodically.
 */
export async function purgeExpiredCache(): Promise<number> {
  const result = await prisma.searchCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (result.count > 0) {
    console.log(`[Cache] Purged ${result.count} expired entries`);
  }
  return result.count;
}
