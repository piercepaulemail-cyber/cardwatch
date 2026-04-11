import { NextRequest, NextResponse } from "next/server";
import { refreshMarketPrices } from "@/lib/sportscardspro";

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const authHeader = request.headers.get("authorization");
  const hasValidSecret =
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const refreshed = await refreshMarketPrices();
    return NextResponse.json({ refreshed });
  } catch (e) {
    console.error("[Price Refresh] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
