import { NextRequest, NextResponse } from "next/server";
import { runCronScan } from "@/lib/scanner";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCronScan();
  console.log(`Cron scan complete: ${result.scanned} users, ${result.found} new results`);
  return NextResponse.json(result);
}
