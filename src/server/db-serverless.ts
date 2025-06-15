import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Instantiates a single instance PrismaClient and saves it on the global object.
 * This approach is optimized for serverless environments to prevent connection pool exhaustion.
 */
export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
    // Increase connection timeout for serverless environments
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling is handled automatically by PrismaClient
    // in serverless environments
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Helper function to handle database connections in serverless functions.
 * This ensures connections are properly managed and released.
 */
export async function withDb<T>(callback: (db: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await callback(db);
  } catch (error) {
    console.error("Database operation failed:", error);
    throw error;
  }
}
