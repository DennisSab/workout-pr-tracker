import assert from "node:assert/strict";
import test from "node:test";
import { assertDevelopmentDatabaseTarget, inspectDatabaseTarget } from "./database-safety.mjs";

const development = {
  DATABASE_ENV: "development",
  SUPABASE_PROJECT_REF: "abcdefghijklmno",
  DATABASE_URL: "postgresql://postgres.abcdefghijklmno:secret@pooler.example:6543/postgres",
  DIRECT_URL: "postgresql://postgres:secret@db.abcdefghijklmno.supabase.co:5432/postgres",
};

test("accepts matching development identities without returning credentials", () => {
  assert.deepEqual(assertDevelopmentDatabaseTarget(development), {
    environment: "development",
    projectRef: "abcdefghijklmno",
    runtimeAndDirectTargetsMatch: true,
  });
});

test("fails closed for production, missing identity, or mismatched targets", () => {
  assert.throws(() => assertDevelopmentDatabaseTarget({ ...development, DATABASE_ENV: "production" }), /Refusing/);
  assert.throws(() => inspectDatabaseTarget({ ...development, SUPABASE_PROJECT_REF: "" }), /required/);
  assert.throws(() => inspectDatabaseTarget({
    ...development,
    DIRECT_URL: "postgresql://postgres:secret@db.zxywvutsrqponml.supabase.co:5432/postgres",
  }), /does not match/);
});
