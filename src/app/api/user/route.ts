import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, createdAt: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();

  if (name !== undefined) {
    const trimmed = String(name).trim().slice(0, 100);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: trimmed || null },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all user data
  await prisma.scanResult.deleteMany({ where: { userId: session.user.id } });
  await prisma.watchlistEntry.deleteMany({ where: { userId: session.user.id } });
  await prisma.subscription.deleteMany({ where: { userId: session.user.id } });
  await prisma.account.deleteMany({ where: { userId: session.user.id } });
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ success: true });
}
