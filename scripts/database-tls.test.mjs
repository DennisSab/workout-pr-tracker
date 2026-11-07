import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rootCertificates } from "node:tls";
import test from "node:test";
import {
  verifiedPostgresConfig,
  verifiedPrismaConnectionString,
} from "../lib/postgres-tls.mjs";

const connectionString =
  "postgresql://postgres.project:password@pooler.example:6543/postgres?pgbouncer=true";
const ca = rootCertificates[0];

test("node-postgres configuration always verifies a valid CA", () => {
  const config = verifiedPostgresConfig(connectionString, {
    env: { SUPABASE_DB_CA_CERT: ca },
  });

  assert.equal(config.connectionString, connectionString);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.ca, ca);
});

test("TLS configuration fails closed without a valid CA", () => {
  assert.throws(
    () => verifiedPostgresConfig(connectionString, { env: {} }),
    /CA certificate is required/
  );
  assert.throws(
    () =>
      verifiedPostgresConfig(connectionString, {
        env: { SUPABASE_DB_CA_CERT: "not a certificate" },
      }),
    /not valid PEM/
  );
});

test("connection-string TLS options cannot override verified configuration", () => {
  const options = [
    "sslmode=require",
    "sslmode=" + "no-verify",
    "sslrootcert=other.crt",
  ];
  for (const option of options) {
    assert.throws(
      () =>
        verifiedPostgresConfig(`${connectionString}&${option}`, {
          env: { SUPABASE_DB_CA_CERT: ca },
        }),
      /TLS is configured separately/
    );
  }
});

test("Prisma CLI always uses full verification", () => {
  const url = new URL(
    verifiedPrismaConnectionString(connectionString, { env: {} })
  );

  assert.equal(url.searchParams.get("sslmode"), "verify-full");
  assert.equal(url.searchParams.has("sslrootcert"), false);
});

test("database connection code never disables certificate verification", async () => {
  const files = [
    "../lib/postgres-tls.mjs",
    "../lib/prisma.ts",
    "./identify-database.mjs",
    "./sync-exercise-catalog.mjs",
    "./preview-historical-workouts.mjs",
    "./import-historical-workouts.mjs",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8"))
  );
  const insecureRejectOption = "rejectUnauthorized" + ": false";
  const insecureSslMode = "sslmode=" + "no-verify";

  for (const source of sources) {
    assert.equal(source.includes(insecureRejectOption), false);
    assert.equal(source.includes(insecureSslMode), false);
  }
});
