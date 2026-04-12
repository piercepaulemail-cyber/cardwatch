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
  conditionDescriptor: string; // "Near mint or better", "Excellent", "Very good", "Poor", ""
}

// Condition descriptor values from eBay
const DESCRIPTOR_NEAR_MINT = "Near mint or better";
const DESCRIPTOR_EXCELLENT = "Excellent";
// const DESCRIPTOR_VERY_GOOD = "Very good";
// const DESCRIPTOR_POOR = "Poor";

const ITEM_DETAIL_ENDPOINT = "https://api.ebay.com/buy/browse/v1/item";

/**
 * Fetch condition descriptors for a list of items via individual getItem calls.
 * Only called when the user has selected a specific condition (nearMint/excellent).
 * Returns a map of itemId → conditionDescriptor string.
 */
async function fetchConditionDescriptors(
  itemIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!itemIds.length) return result;

  const token = await getEbayToken();

  // Fetch in parallel, max 10 concurrent to respect rate limits
  const batchSize = 10;
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    const promises = batch.map(async (itemId) => {
      try {
        const resp = await fetch(`${ITEM_DETAIL_ENDPOINT}/${itemId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const descriptors = data.conditionDescriptors || [];
        for (const desc of descriptors) {
          for (const val of desc.values || []) {
            if (val.content) {
              result.set(itemId, val.content);
              return;
            }
          }
        }
      } catch {
        // Skip items we can't fetch
      }
    });
    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < itemIds.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return result;
}

/**
 * Fetch item details (condition + all images) for the detail view.
 * Returns condition string and array of all image URLs.
 */
export async function fetchItemDetails(
  ebayItemId: string
): Promise<{ condition: string | null; images: string[] }> {
  try {
    const token = await getEbayToken();
    const resp = await fetch(`${ITEM_DETAIL_ENDPOINT}/${ebayItemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });
    if (!resp.ok) return { condition: null, images: [] };
    const data = await resp.json();

    // Get condition
    let condition: string | null = null;
    const descriptors = data.conditionDescriptors || [];
    for (const desc of descriptors) {
      for (const val of desc.values || []) {
        if (val.content) { condition = val.content; break; }
      }
      if (condition) break;
    }
    if (!condition) condition = data.condition || null;

    // Get all images (main + additional) in high resolution
    const images: string[] = [];
    if (data.image?.imageUrl) {
      images.push(data.image.imageUrl.replace(/s-l\d+\./, "s-l1600."));
    }
    for (const img of data.additionalImages || []) {
      if (img.imageUrl) {
        images.push(img.imageUrl.replace(/s-l\d+\./, "s-l1600."));
      }
    }

    return { condition, images };
  } catch {
    return { condition: null, images: [] };
  }
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
      conditionDescriptor: "", // Populated later via getItem if needed
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
  // eBay conditionIds: 1000=New, 1500=Open Box, 2750=Graded, 3000=Used, 4000=Ungraded
  // Note: nearMint/excellent behave the same as ungraded to conserve API calls.
  // The Browse API doesn't return condition descriptors in search results,
  // and fetching individual item details costs 1 API call per result (~100x overhead).
  // ~90% of ungraded listings are near mint anyway.
  const cond = query.condition || "ungraded";
  if (cond === "graded") {
    filtered = filtered.filter((r) => r.conditionId === "2750");
  } else {
    // ungraded, nearMint, excellent — show all non-graded cards
    filtered = filtered.filter((r) => r.conditionId !== "2750");
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

const FINDING_API_ENDPOINT =
  "https://svcs.ebay.com/services/search/FindingService/v1";

/**
 * Fetch eBay recently sold prices for a card using the Finding API.
 *
 * Uses the same EBAY_APP_ID as the Browse API — no extra credentials needed.
 * Filters for SoldItemsOnly so we only get prices buyers actually paid,
 * not asking prices from active or unsold listings.
 *
 * Returns an array of sold prices (USD) from the last 30 days, or null if
 * eBay credentials are missing or the request fails.
 */
export async function getEbaySoldPrices(
  playerName: string,
  cardDescription: string
): Promise<number[] | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;

  try {
    const keywords = `${playerName} ${cardDescription}`;
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const params = new URLSearchParams({
      "OPERATION-NAME": "findCompletedItems",
      "SERVICE-VERSION": "1.0.0",
      "SECURITY-APPNAME": appId,
      "RESPONSE-DATA-FORMAT": "JSON",
      "REST-PAYLOAD": "",
      keywords,
      categoryId: SPORTS_CARDS_CATEGORY,
      "itemFilter(0).name": "SoldItemsOnly",
      "itemFilter(0).value": "true",
      "itemFilter(1).name": "EndTimeFrom",
      "itemFilter(1).value": thirtyDaysAgo,
      "paginationInput.entriesPerPage": "50",
      sortOrder: "EndTimeSoonest",
    });

    const resp = await fetch(`${FINDING_API_ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.error(`[eBay Finding] API error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const findResp = data.findCompletedItemsResponse?.[0];
    const ack = findResp?.ack?.[0];
    if (ack !== "Success" && ack !== "Warning") {
      console.error(`[eBay Finding] Unexpected ack: ${ack}`);
      return null;
    }

    const items: Record<string, unknown>[] =
      findResp?.searchResult?.[0]?.item ?? [];
    const prices: number[] = [];

    for (const item of items) {
      const state = (
        item.sellingStatus as Record<string, unknown>[]
      )?.[0]?.sellingState as string[] | undefined;
      if (state?.[0] !== "EndedWithSales") continue;

      const priceEntry = (
        item.sellingStatus as Record<string, unknown>[]
      )?.[0]?.currentPrice as Record<string, unknown>[] | undefined;
      const priceStr = priceEntry?.[0]?.["__value__"] as string | undefined;
      const price = parseFloat(priceStr ?? "0");
      if (price > 0) prices.push(price);
    }

    console.log(
      `[eBay Finding] "${keywords}" → ${prices.length} sold prices in last 30d`
    );
    return prices.length > 0 ? prices : null;
  } catch (e) {
    console.error("[eBay Finding] Error:", e);
    return null;
  }
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
