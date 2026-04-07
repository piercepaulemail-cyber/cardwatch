import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSubscription } from "@/lib/require-subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await requireSubscription(session.user.id);
  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const entries = await prisma.watchlistEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await requireSubscription(session.user.id);
  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { playerName, cardDescription, maxPrice, minPrice, listingType, condition, notes } =
    await request.json();

  if (!playerName || !cardDescription) {
    return NextResponse.json(
      { error: "playerName and cardDescription are required" },
      { status: 400 }
    );
  }

  // Input validation
  const trimmedPlayer = String(playerName).trim().slice(0, 200);
  const trimmedDesc = String(cardDescription).trim().slice(0, 200);
  if (!trimmedPlayer || !trimmedDesc) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const entry = await prisma.watchlistEntry.create({
    data: {
      userId: session.user.id,
      playerName: trimmedPlayer,
      cardDescription: trimmedDesc,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      listingType: ["all", "buyItNow", "auction"].includes(listingType) ? listingType : "all",
      condition: ["ungraded", "nearMint", "excellent", "graded"].includes(condition) ? condition : "ungraded",
      notes: notes ? String(notes).slice(0, 500) : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await requireSubscription(session.user.id);
  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { id } = await request.json();

  const entry = await prisma.watchlistEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.watchlistEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
