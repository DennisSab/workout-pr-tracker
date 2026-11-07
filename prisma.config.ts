import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { verifiedPrismaConnectionString } from "./lib/postgres-tls.mjs";

// Prisma CLI does not load Next.js env files itself. Use Next's development
// precedence for local CLI commands; an already-set process.env still wins.
loadEnvConfig(process.cwd(), true);

const datasourceUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: verifiedPrismaConnectionString(datasourceUrl, {
      variableName: process.env["DIRECT_URL"] ? "DIRECT_URL" : "DATABASE_URL",
    }),
  },
});
