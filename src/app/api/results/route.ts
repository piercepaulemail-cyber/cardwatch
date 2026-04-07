import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await requireSubscription(session.user.id);
  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "scanTimestamp";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;

  const allowedSorts = [
    "currentPrice",
    "bidCount",
    "sellerFeedback",
    "listingType",
    "listingStartTime",
    "scanTimestamp",
    "matchedPlayer",
    "title",
  ];

  const orderField = allowedSorts.includes(sortBy) ? sortBy : "scanTimestamp";

  const [results, total] = await Promise.all([
    prisma.scanResult.findMany({
      where: { userId: session.user.id },
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scanResult.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  const result = await prisma.scanResult.findUnique({ where: { id } });
  if (!result || result.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scanResult.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
