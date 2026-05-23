import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  databaseUrl: string | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Recreate pool when .env DATABASE_URL changes (common after switching DBs).
  if (globalForPrisma.databaseUrl !== connectionString) {
    void globalForPrisma.pool?.end();
    globalForPrisma.pool = undefined;
    globalForPrisma.prisma = undefined;
    globalForPrisma.databaseUrl = connectionString;
  }

  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
