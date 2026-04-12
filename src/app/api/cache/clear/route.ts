import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/cache/clear
 * Deletes all MarketPriceCache entries so they are re-fetched fresh from SCP.
 * Auth: session OR CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("authorization")?.replace("Bearer ", "");

  if (cronSecret && headerSecret === cronSecret) {
    // Authorized via CRON_SECRET — skip session check
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { count } = await prisma.marketPriceCache.deleteMany({});

  console.log(`[Cache] Cleared ${count} market price cache entries`);
  return NextResponse.json({ success: true, cleared: count });
}
