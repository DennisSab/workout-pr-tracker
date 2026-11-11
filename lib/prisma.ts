import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { verifiedPostgresConfig } from "@/lib/postgres-tls.mjs";

const pool = new Pool({
  ...verifiedPostgresConfig(process.env.DATABASE_URL),
  max: 1,
  allowExitOnIdle: true,
});


const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
