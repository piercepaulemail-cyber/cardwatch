import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/cache/clear
 * Expires all MarketPriceCache entries so they are re-fetched on next access.
 * Requires an authenticated session.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await prisma.marketPriceCache.deleteMany({});

  console.log(`[Cache] Cleared ${count} market price cache entries`);
  return NextResponse.json({ success: true, cleared: count });
}
