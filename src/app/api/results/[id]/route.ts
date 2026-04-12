import { NextRequest, NextResponse, connection } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";
import { fetchItemDetails } from "@/lib/ebay";
import { getMarketPrices } from "@/lib/sportscardspro";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await requireSubscription(session.user.id);
  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { id } = await context.params;

  const result = await prisma.scanResult.findUnique({
    where: { id },
  });

  if (!result || result.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch details from eBay (condition + all images)
  let condition = result.conditionDescriptor;
  let images: string[] = [];

  const details = await fetchItemDetails(result.ebayItemId);
  images = details.images;

  if (!condition && details.condition) {
    condition = details.condition;
    await prisma.scanResult.update({
      where: { id },
      data: { conditionDescriptor: condition },
    }).catch(() => {});
  }

  if (images.length === 0 && result.imageUrl) {
    images = [result.imageUrl.replace(/s-l\d+\./, "s-l1600.")];
  }

  // Always fetch market prices — getMarketPrices has its own cache (MarketPriceCache table)
  const needsMarketData =
    !result.marketLastFetched ||
    Date.now() - result.marketLastFetched.getTime() > 7 * 24 * 60 * 60 * 1000;

  console.log(`[Detail] Market data needed: ${needsMarketData}, player: ${result.matchedPlayer}, desc: ${result.matchedDesc}`);
  console.log(`[Detail] SCP_API_KEY set: ${!!process.env.SCP_API_KEY}`);

  const market = await getMarketPrices(result.matchedPlayer, result.matchedDesc, result.title);
  console.log(`[Detail] Market result:`, JSON.stringify(market));

  if (needsMarketData && market) {
    await prisma.scanResult.update({
      where: { id },
      data: {
        marketUngraded: market.ungraded,
        marketPsa10: market.psa10,
        marketLastFetched: new Date(),
      },
    }).catch(() => {});
  }

  const { marketUngraded: _u, marketPsa9: _p9, marketPsa10: _p10, ...resultRest } = result;

  const response = NextResponse.json({
    ...resultRest,
    conditionDescriptor: condition,
    images,
    rawMin: market?.ungradedMin ?? null,
    rawMax: market?.ungradedMax ?? null,
    psa10Min: market?.psa10Min ?? null,
    psa10Max: market?.psa10Max ?? null,
  });

  // Prevent caching so market data always fetches fresh
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
