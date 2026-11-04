import nextEnv from "@next/env";
import pg from "pg";
import { inspectDatabaseTarget } from "./database-safety.mjs";

nextEnv.loadEnvConfig(process.cwd(), true);
const configured = inspectDatabaseTarget();
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

let transaction = false;
try {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  transaction = true;
  await client.query("SET LOCAL statement_timeout = '10s'");
  const result = await client.query(`SELECT current_database() AS database_name,
    current_user AS database_user,
    current_setting('transaction_read_only') AS transaction_read_only`);
  await client.query("ROLLBACK");
  transaction = false;
  console.log(JSON.stringify({
    mode: "READ ONLY DATABASE IDENTITY",
    configured,
    observed: result.rows[0],
  }, null, 2));
} catch (error) {
  console.error(`Database identity check failed${error.code ? ` (${error.code})` : ""}: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (transaction) await client.query("ROLLBACK").catch(() => {});
  await client.end().catch(() => {});
}
