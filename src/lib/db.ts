import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Always use Neon serverless adapter for postgresql:// URLs (production + Neon)
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const pool = new Pool({ connectionString: url });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon(pool as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  // Local dev with prisma+postgres:// URL (Prisma Accelerate)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ accelerateUrl: url } as any);
}

// Use a getter to ensure lazy initialization (env vars available at call time, not import time)
let _prisma: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma || createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = _prisma;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_prisma as any)[prop];
  },
});
