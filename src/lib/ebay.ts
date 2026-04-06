const BROWSE_API_ENDPOINT =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";
const TOKEN_ENDPOINT = "https://api.ebay.com/identity/v1/oauth2/token";
const SPORTS_CARDS_CATEGORY = "261328";
const CONDITION_UNGRADED = "4000";

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
}

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
}

export async function searchEbay(
  query: EbaySearchQuery,
  lookbackMinutes: number
): Promise<EbayResult[]> {
  const token = await getEbayToken();
  const keywords = `${query.playerName} ${query.cardDescription}`;
  const cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  const filters = [
    `categoryId:${SPORTS_CARDS_CATEGORY}`,
    `conditionIds:{${CONDITION_UNGRADED}}`,
    "buyingOptions:{AUCTION|FIXED_PRICE}",
  ];

  if (query.maxPrice) {
    filters.push(`price:[..${query.maxPrice}]`);
  }

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
      itemUrl: item.itemWebUrl || "",
      imageUrl: item.image?.imageUrl || "",
      listingStartTime: new Date(originDate || Date.now()),
      matchedPlayer: query.playerName,
      matchedDesc: query.cardDescription,
    });
  }

  return results;
}

export async function runUserScan(
  queries: EbaySearchQuery[],
  lookbackMinutes: number
): Promise<EbayResult[]> {
  const allResults: EbayResult[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < queries.length; i++) {
    try {
      const results = await searchEbay(queries[i], lookbackMinutes);
      for (const item of results) {
        if (!seenIds.has(item.ebayItemId)) {
          seenIds.add(item.ebayItemId);
          allResults.push(item);
        }
      }
    } catch (e) {
      console.error(
        `Search failed for "${queries[i].playerName} ${queries[i].cardDescription}":`,
        e
      );
    }

    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return allResults;
}
