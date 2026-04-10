import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";
import { fetchItemDetails } from "@/lib/ebay";

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
    // Cache the condition
    await prisma.scanResult.update({
      where: { id },
      data: { conditionDescriptor: condition },
    }).catch(() => {});
  }

  // If no images from getItem, use the stored thumbnail
  if (images.length === 0 && result.imageUrl) {
    images = [result.imageUrl.replace(/s-l\d+\./, "s-l1600.")];
  }

  return NextResponse.json({
    ...result,
    conditionDescriptor: condition,
    images,
  });
}
