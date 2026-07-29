import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. Next.js dev mode hot-reloads modules, which would
 * otherwise exhaust the connection pool by creating a new client per reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
