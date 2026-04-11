import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";
import { fetchItemDetails } from "@/lib/ebay";
import { getMarketPrices } from "@/lib/sportscardspro";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

  // Fetch market prices (cached, 7-day TTL)
  let marketUngraded = result.marketUngraded;
  let marketPsa9 = result.marketPsa9;
  let marketPsa10 = result.marketPsa10;

  const needsMarketData =
    !result.marketLastFetched ||
    Date.now() - result.marketLastFetched.getTime() > 7 * 24 * 60 * 60 * 1000;

  console.log(`[Detail] Market data needed: ${needsMarketData}, player: ${result.matchedPlayer}, desc: ${result.matchedDesc}`);
  console.log(`[Detail] SCP_API_KEY set: ${!!process.env.SCP_API_KEY}`);

  if (needsMarketData) {
    const market = await getMarketPrices(result.matchedPlayer, result.matchedDesc);
    console.log(`[Detail] Market result:`, JSON.stringify(market));
    if (market) {
      marketUngraded = market.ungraded;
      marketPsa9 = market.psa9;
      marketPsa10 = market.psa10;

      await prisma.scanResult.update({
        where: { id },
        data: {
          marketUngraded: market.ungraded,
          marketPsa9: market.psa9,
          marketPsa10: market.psa10,
          marketLastFetched: new Date(),
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ...result,
    conditionDescriptor: condition,
    images,
    marketUngraded,
    marketPsa9,
    marketPsa10,
  });
}
