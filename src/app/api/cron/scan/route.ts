import { NextRequest, NextResponse } from "next/server";
import { runCronScan } from "@/lib/scanner";

export async function GET(request: NextRequest) {
  // Vercel Cron sends this header automatically
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  // Also allow manual trigger with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const hasValidSecret =
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCronScan();
    console.log(
      `Cron scan complete: ${result.scanned} users, ${result.found} new results, ${result.apiCalls} API calls`
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("Cron scan error:", e);
    return NextResponse.json(
      { error: "Scan failed", message: String(e) },
      { status: 500 }
    );
  }
}
