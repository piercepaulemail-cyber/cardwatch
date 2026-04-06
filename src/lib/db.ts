import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL!;

  // Neon serverless adapter for postgresql:// URLs
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const sql = neon(url);
    const adapter = new PrismaNeon(sql);
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  // Prisma Accelerate / local dev
  return new PrismaClient({
    accelerateUrl: url,
  } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
