import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { playerName, cardDescription, maxPrice, minPrice, listingType, notes } =
    await request.json();

  if (!playerName || !cardDescription) {
    return NextResponse.json(
      { error: "playerName and cardDescription are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.watchlistEntry.create({
    data: {
      userId: session.user.id,
      playerName: playerName.trim(),
      cardDescription: cardDescription.trim(),
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      listingType: listingType || "all",
      notes: notes || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  const entry = await prisma.watchlistEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.watchlistEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
