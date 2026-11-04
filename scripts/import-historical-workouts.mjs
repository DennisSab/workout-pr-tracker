// Default: read-only preflight. --apply: one guarded import. --verify: read-only post-import audit.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import { validateHistory } from "./preview-historical-workouts.mjs";
import { assertDevelopmentDatabaseTarget } from "./database-safety.mjs";

const approvedSourceHash = "17c00aa6416348fd5916019af60758b18cbeee6220df2cf0b9a692a6537e1238";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validateApprovedInput(source, canonical, preview) {
  assert.equal(sha256(source), approvedSourceHash, "Historical source differs from the approved file.");
  assert.equal(preview.sourceSha256, approvedSourceHash, "Preview differs from the approved source.");
  assert.equal(preview.readyForImport, true, "Preview is not ready for import.");
  assert.deepEqual(preview.blockers, []);
  const history = JSON.parse(source);
  const validation = validateHistory(history, canonical);
  assert.deepEqual(validation.totals, {
    workouts: 24, exercisesPerformed: 121, distinctExercises: 31, sets: 345,
    weightedSets: 342, bodyweightSets: 3, earliestDate: "2026-06-08", latestDate: "2026-09-05",
  });
  assert.deepEqual(preview.totals, validation.totals);
  assert.deepEqual(preview.workouts, validation.workouts);
  assert.equal(preview.resolvedWorkouts.length, 24);
  assert.equal(typeof preview.proposedUserId, "string");
  assert.ok(preview.proposedUserId.length > 0);
  const ids = new Map();
  history.workouts.forEach((workout, index) => {
    const resolved = preview.resolvedWorkouts[index];
    assert.equal(resolved.date, workout.date);
    assert.equal(resolved.notes, workout.notes);
    assert.equal(resolved.userId, preview.proposedUserId);
    const sets = workout.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exerciseName: exercise.exerciseName, ...set })));
    assert.equal(resolved.sets.length, sets.length);
    resolved.sets.forEach((set, setIndex) => {
      const { exerciseId, ...values } = set;
      assert.deepEqual(values, sets[setIndex], `Preview set differs on ${workout.date}, set index ${setIndex}.`);
      assert.equal(typeof exerciseId, "string");
      assert.ok(exerciseId.length > 0);
      if (ids.has(set.exerciseName)) assert.equal(exerciseId, ids.get(set.exerciseName));
      ids.set(set.exerciseName, exerciseId);
      if (set.weight === null) {
        assert.equal(workout.date, "2026-06-08");
        assert.equal(set.exerciseName, "Chest Dips");
      }
    });
  });
  assert.equal(ids.size, 31);
  assert.equal(new Set(ids.values()).size, 31, "Canonical exercise IDs must be distinct.");
  return { history, validation, ids };
}

async function getCounts(client) {
  return (await client.query('SELECT (SELECT COUNT(*)::int FROM public."Workout") AS workouts, (SELECT COUNT(*)::int FROM public."WorkoutSet") AS sets')).rows[0];
}

async function checkCatalogAndUser(client, canonical, preview, ids) {
  const catalog = (await client.query('SELECT id, name, "muscleGroup" FROM public."Exercise" ORDER BY id')).rows;
  assert.equal(catalog.length, 31);
  for (const exercise of canonical) {
    const matches = catalog.filter((row) => row.name === exercise.name);
    assert.equal(matches.length, 1, `Missing/ambiguous exercise: ${exercise.name}`);
    assert.equal(matches[0].id, ids.get(exercise.name), `Exercise ID changed: ${exercise.name}`);
    assert.equal(matches[0].muscleGroup, exercise.muscleGroup);
  }
  const users = (await client.query('SELECT id FROM public."User" ORDER BY id')).rows;
  assert.deepEqual(users, [{ id: preview.proposedUserId }], "The existing user differs from the approved preview.");
  const weight = (await client.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='WorkoutSet' AND column_name='weight'")).rows[0];
  assert.equal(weight?.is_nullable, "YES", "Bodyweight migration must already be applied.");
  return { catalog, users };
}

export function verifyStoredRows(workouts, sets, preview) {
  assert.equal(workouts.length, 24);
  assert.equal(sets.length, 345);
  assert.equal(new Set(workouts.map((row) => row.date)).size, 24, "Duplicate workout dates.");
  const summaries = [];
  for (const expected of preview.resolvedWorkouts) {
    const matches = workouts.filter((row) => row.date === expected.date);
    assert.equal(matches.length, 1, `Missing/duplicate workout on ${expected.date}`);
    const workout = matches[0];
    assert.equal(workout.notes, expected.notes);
    assert.equal(workout.userId, preview.proposedUserId);
    const actualSets = sets.filter((set) => set.workoutId === workout.id);
    const normalize = (rows) => rows.map(({ exerciseId, setNumber, reps, weight }) => ({ exerciseId, setNumber, reps, weight }))
      .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId) || a.setNumber - b.setNumber);
    assert.deepEqual(normalize(actualSets), normalize(expected.sets), `Set values/order differ on ${expected.date}`);
    summaries.push({ date: workout.date, label: workout.notes, exerciseCount: new Set(actualSets.map((set) => set.exerciseId)).size, setCount: actualSets.length });
  }
  assert.deepEqual(summaries, preview.workouts, "Per-workout counts differ from the approved preview.");
  const nullSets = sets.filter((set) => set.weight === null);
  assert.equal(nullSets.length, 3);
  const june8 = workouts.find((workout) => workout.date === "2026-06-08");
  const dipsId = preview.resolvedWorkouts[0].sets.find((set) => set.exerciseName === "Chest Dips").exerciseId;
  assert.ok(nullSets.every((set) => set.workoutId === june8.id && set.exerciseId === dipsId));
  return {
    verification: "PASS", workouts: 24, sets: 345, earliestDate: summaries[0].date, latestDate: summaries.at(-1).date,
    bodyweightSets: 3, allBodyweightSetsAreJune8ChestDips: true, correctUserForEveryWorkout: true,
    everySetMatchesApprovedExerciseRepsWeightAndSetNumber: true, duplicateWorkoutDates: 0,
    everyWorkoutMatchesApprovedCounts: true, summaries,
  };
}

async function verifyDatabase(client, preview) {
  // Format timestamp-without-timezone in SQL so the audit cannot shift dates via JS timezone conversion.
  const workouts = (await client.query('SELECT id, to_char(date, \'YYYY-MM-DD\') AS date, notes, "userId" FROM public."Workout" ORDER BY date, id')).rows;
  const sets = (await client.query('SELECT id, "workoutId", "exerciseId", "setNumber", reps, weight FROM public."WorkoutSet" ORDER BY "workoutId", "exerciseId", "setNumber"')).rows;
  return verifyStoredRows(workouts, sets, preview);
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && ["--apply", "--verify"].includes(args[0])), "Use no arguments, --apply, or --verify.");
  const apply = args[0] === "--apply";
  const verify = args[0] === "--verify";
  const source = await readFile(new URL("./historical-workouts.json", import.meta.url), "utf8");
  const canonicalSource = await readFile(new URL("./canonical-exercises.json", import.meta.url), "utf8");
  const canonical = JSON.parse(canonicalSource);
  const previewSource = await readFile(new URL("./historical-workouts.preview.json", import.meta.url), "utf8");
  const preview = JSON.parse(previewSource);
  const { validation, ids } = validateApprovedInput(source, canonical, preview);
  nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), true);
  if (apply) assertDevelopmentDatabaseTarget();
  assert.ok(process.env.DATABASE_URL);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  let inTransaction = false;
  let committed = false;
  let receiptPath;
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    inTransaction = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    if (apply) {
      await client.query('LOCK TABLE public."User", public."Exercise", public."Workout", public."WorkoutSet" IN SHARE ROW EXCLUSIVE MODE');
    }
    const before = await checkCatalogAndUser(client, canonical, preview, ids);
    if (verify) {
      const report = await verifyDatabase(client, preview);
      await client.query("ROLLBACK");
      inTransaction = false;
      console.log(JSON.stringify({ mode: "INDEPENDENT READ ONLY VERIFICATION", canonicalExercises: before.catalog.length, ...report }, null, 2));
      return;
    }
    assert.deepEqual(await getCounts(client), { workouts: 0, sets: 0 }, "Aborting: workouts or sets already exist. Import cannot be repeated.");
    if (!apply) {
      await client.query("ROLLBACK");
      inTransaction = false;
      console.log(JSON.stringify({ mode: "READ ONLY PREFLIGHT", emptyWorkoutTables: true, exactApprovedSourceAndPreview: true, canonicalIdsAndUserVerified: true, ...validation }, null, 2));
      return;
    }
    // Retain exercise sequence in the local receipt. The schema has no exercise-order column.
    const plan = preview.resolvedWorkouts.map((workout) => ({
      ...workout, id: randomUUID(), sets: workout.sets.map((set) => ({ ...set, id: randomUUID() })),
    }));
    const directory = await mkdtemp(join(tmpdir(), "workoutpr-historical-import-"));
    receiptPath = join(directory, "receipt.json");
    const receipt = { status: "PREPARED, NOT YET COMMITTED", sourceSha256: sha256(source), previewSha256: sha256(previewSource), canonicalSha256: sha256(canonicalSource), before, plan };
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    for (const workout of plan) {
      // Match the app's local-noon convention, using timestamp literals without timezone conversion.
      await client.query('INSERT INTO public."Workout" (id, date, notes, "userId") VALUES ($1, $2::timestamp, $3, $4)',
        [workout.id, `${workout.date}T12:00:00`, workout.notes, workout.userId]);
      const values = workout.sets.flatMap((set) => [set.id, workout.id, set.exerciseId, set.setNumber, set.reps, set.weight]);
      const placeholders = workout.sets.map((_, index) => `(${Array.from({ length: 6 }, (_unused, column) => `$${index * 6 + column + 1}`).join(", ")})`).join(", ");
      await client.query(`INSERT INTO public."WorkoutSet" (id, "workoutId", "exerciseId", "setNumber", reps, weight) VALUES ${placeholders}`, values);
    }
    const report = await verifyDatabase(client, preview);
    assert.deepEqual(await checkCatalogAndUser(client, canonical, preview, ids), before, "Catalog or user changed.");
    await client.query("COMMIT");
    inTransaction = false;
    committed = true;
    await writeFile(receiptPath, JSON.stringify({ ...receipt, status: "COMMITTED", committedAt: new Date().toISOString(), report }, null, 2) + "\n", { mode: 0o600 });
    console.log(JSON.stringify({ mode: "IMPORTED AND COMMITTED", receiptPath, catalogAndUserUnchanged: true, ...report }, null, 2));
  } catch (error) {
    if (inTransaction) {
      try { await client.query("ROLLBACK"); } catch { console.error("Rollback could not be confirmed; verify database state before retrying."); }
      inTransaction = false;
    }
    if (committed) console.error(`Import already committed; do not retry. Receipt path: ${receiptPath}`);
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`Historical import failed${error.code ? ` (${error.code})` : ""}: ${error.message}`); process.exitCode = 1; });
}
