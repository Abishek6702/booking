import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import { getLogger, serializeError } from "../utils/logger.util";

const prismaLogger = getLogger("config.prisma");

const globalForPrisma = globalThis as unknown as { 
  prisma?: PrismaClient;
  pool?: pg.Pool;
};

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

export const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

pool.on("error", (err) => {
  prismaLogger.error({ err: serializeError(err) }, "Unexpected error on idle database client");
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // "info" logs every query and may expose PII in production.
    // Only enable it in development.
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["error", "warn", "info"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
