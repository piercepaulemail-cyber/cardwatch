import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";
import { fetchSingleItemCondition } from "@/lib/ebay";

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

  // Fetch condition if not already cached
  let condition = result.conditionDescriptor;
  if (!condition) {
    condition = await fetchSingleItemCondition(result.ebayItemId);
    if (condition) {
      await prisma.scanResult.update({
        where: { id },
        data: { conditionDescriptor: condition },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ...result,
    conditionDescriptor: condition,
  });
}
