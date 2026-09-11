import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "@/lib/config";

/**
 * The single Prisma client for the process.
 *
 * Instantiated here and imported only by module repositories (see
 * `docs/architecture.md`). Prisma 7 talks to Postgres through a driver adapter
 * rather than its own engine, so the `pg` pool is created alongside the client.
 *
 * In development the instance is stashed on `globalThis` so Hot Module Reload
 * does not open a new pool on every file change.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "../generated/prisma/client";
