import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint, keys } = await request.json();

  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
    },
    update: {
      userId: session.user.id,
      auth: keys.auth,
      p256dh: keys.p256dh,
    },
  });

  return NextResponse.json({ success: true });
}
