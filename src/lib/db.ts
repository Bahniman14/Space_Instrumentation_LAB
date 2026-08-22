import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Runtime queries always go through the Neon serverless driver adapter over the
// pooled connection string — required so Vercel's serverless functions don't
// exhaust Postgres's connection limit. Migrations use DATABASE_URL_UNPOOLED
// instead (configured in prisma.config.ts), never this client. See CLAUDE.md §3.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
