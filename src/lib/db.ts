import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma. Next.js dev melakukan hot-reload modul, sehingga tanpa
 * cache global setiap reload membuat koneksi baru sampai pool habis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
