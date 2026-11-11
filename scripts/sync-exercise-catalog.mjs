// Preview: node scripts/sync-exercise-catalog.mjs
// Apply only after approval: node scripts/sync-exercise-catalog.mjs --apply --approved-preview=/absolute/path/preview.json
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import { verifiedPostgresConfig } from "../lib/postgres-tls.mjs";
import { assertDevelopmentDatabaseTarget } from "./database-safety.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const approvedPath = args.find((arg) => arg.startsWith("--approved-preview="))?.slice("--approved-preview=".length);
if (args.some((arg) => arg !== "--apply" && !arg.startsWith("--approved-preview=")) ||
    args.filter((arg) => arg === "--apply").length > 1 ||
    args.filter((arg) => arg.startsWith("--approved-preview=")).length > 1 ||
    (apply && !approvedPath) || (!apply && approvedPath)) {
  throw new Error("Use no arguments for preview, or --apply --approved-preview=/absolute/path/preview.json after approval.");
}

const canonical = JSON.parse(await readFile(new URL("./canonical-exercises.json", import.meta.url), "utf8"));
const groups = new Set(["Chest", "Shoulders", "Triceps", "Back", "Biceps", "Legs"]);
if (!Array.isArray(canonical) || canonical.length !== 31 ||
    canonical.some((row) => !row || typeof row.name !== "string" || !row.name.trim() || row.name !== row.name.trim() || !groups.has(row.muscleGroup)) ||
    new Set(canonical.map((row) => row.name)).size !== 31) {
  throw new Error("Canonical catalog must contain exactly 31 unique names and valid muscle groups.");
}

nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), true);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (apply) assertDevelopmentDatabaseTarget();
const client = new pg.Client({
  ...verifiedPostgresConfig(process.env.DATABASE_URL),
  connectionTimeoutMillis: 10000,
});
let inTransaction = false;

async function assertEmptyWorkouts() {
  const { rows: [counts] } = await client.query('SELECT (SELECT COUNT(*)::int FROM public."Workout") AS workouts, (SELECT COUNT(*)::int FROM public."WorkoutSet") AS workout_sets');
  if (counts.workouts !== 0 || counts.workout_sets !== 0) {
    throw new Error(`Aborting: workout data exists (${counts.workouts} workouts, ${counts.workout_sets} sets).`);
  }
  return counts;
}

async function readCatalog() {
  return (await client.query('SELECT id, name, "muscleGroup" FROM public."Exercise" ORDER BY name COLLATE "C", id')).rows;
}

try {
  await client.connect();
  await client.query(apply ? "BEGIN" : "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  inTransaction = true;
  await client.query("SET LOCAL statement_timeout = '15s'");
  await client.query("SET LOCAL lock_timeout = '5s'");
  if (apply) {
    // Block writes, while allowing normal readers, until verification and commit.
    await client.query('LOCK TABLE public."Exercise", public."Workout", public."WorkoutSet" IN SHARE ROW EXCLUSIVE MODE');
  }
  const counts = await assertEmptyWorkouts();
  const references = (await client.query(`SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public."Exercise"'::regclass ORDER BY conname`)).rows;
  if (references.length !== 1 || !['"WorkoutSet"', 'public."WorkoutSet"'].includes(references[0].table_name) ||
      !references[0].definition.startsWith('FOREIGN KEY ("exerciseId") REFERENCES "Exercise"(id)')) {
    throw new Error("Exercise foreign keys differ from the inspected schema; review references before proceeding.");
  }
  const current = await readCatalog();
  if (new Set(current.map((row) => row.name)).size !== current.length) {
    throw new Error("Duplicate existing exercise names require explicit review before cleanup.");
  }
  const targets = new Map(canonical.map((row) => [row.name, row]));
  const existing = new Map(current.map((row) => [row.name, row]));
  const keep = current.filter((row) => targets.has(row.name));
  if (keep.some((row) => row.muscleGroup !== targets.get(row.name).muscleGroup)) {
    throw new Error("An existing canonical match has a different muscle group; explicit review is required.");
  }
  const remove = current.filter((row) => !targets.has(row.name));
  const insert = canonical.filter((row) => !existing.has(row.name));
  const plan = { keep, delete: remove, insert, finalCount: keep.length + insert.length };
  const snapshot = { canonical, current, references, counts, plan };

  if (!apply) {
    await client.query("ROLLBACK");
    inTransaction = false;
    const directory = await mkdtemp(join(tmpdir(), "workoutpr-exercise-preview-"));
    const backupPath = join(directory, "preview.json");
    await writeFile(backupPath, JSON.stringify(snapshot, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ mode: "READ ONLY PREVIEW", counts, ...plan, backupPath }, null, 2));
    console.log("No database changes made. Backup includes every original exercise ID and muscle group. Apply requires explicit approval and this preview file.");
  } else {
    const approved = JSON.parse(await readFile(approvedPath, "utf8"));
    if (JSON.stringify(approved) !== JSON.stringify(snapshot)) {
      throw new Error("Catalog, canonical data, or references changed since the approved preview. Run and review a fresh preview.");
    }
    if (remove.length) {
      const deleted = await client.query('DELETE FROM public."Exercise" WHERE id = ANY($1::text[])', [remove.map((row) => row.id)]);
      if (deleted.rowCount !== remove.length) throw new Error("Unexpected deletion count.");
    }
    for (const row of insert) {
      await client.query('INSERT INTO public."Exercise" (id, name, "muscleGroup") VALUES ($1, $2, $3)', [randomUUID(), row.name, row.muscleGroup]);
    }
    const final = await readCatalog();
    if (final.length !== 31 || new Set(final.map((row) => row.name)).size !== 31 ||
        final.some((row) => targets.get(row.name)?.muscleGroup !== row.muscleGroup) ||
        keep.some((row) => !final.some((saved) => saved.id === row.id && saved.name === row.name))) {
      throw new Error("Final catalog does not exactly match the approved 31 exercises and preserved IDs.");
    }
    await assertEmptyWorkouts();
    await client.query("COMMIT");
    inTransaction = false;
    console.log(JSON.stringify({ mode: "APPLIED", preserved: keep.length, deleted: remove.length, inserted: insert.length, finalCount: final.length, exercises: final }, null, 2));
  }
} catch (error) {
  if (inTransaction) await client.query("ROLLBACK").catch(() => {});
  // Avoid printing connection strings or credentials.
  console.error(`Exercise catalog sync failed${error.code ? ` (${error.code})` : ""}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
