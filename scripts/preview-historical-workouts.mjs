// Read-only preview only. There is deliberately no apply/import mode.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";

export function validateHistory(history, canonical) {
  assert.equal(history.version, 1);
  assert.equal(history.mode, "staging-only");
  assert.equal(history.weightUnit, "kg");
  assert.equal(canonical.length, 31);
  const names = new Set(canonical.map((exercise) => exercise.name));
  assert.equal(names.size, 31);
  assert.ok(Array.isArray(history.workouts) && history.workouts.length > 0);
  const seenDates = new Set();
  const usedNames = new Set();
  const blockers = [];
  let exercisesPerformed = 0;
  let totalSets = 0;
  let bodyweightSets = 0;
  const workouts = history.workouts.map((workout) => {
    assert.match(workout.date, /^2026-\d{2}-\d{2}$/);
    const date = new Date(`${workout.date}T12:00:00Z`);
    assert.ok(Number.isFinite(date.getTime()), `Invalid date: ${workout.date}`);
    assert.equal(date.toISOString().slice(0, 10), workout.date);
    assert.ok(!seenDates.has(workout.date), `Duplicate workout date: ${workout.date}`);
    seenDates.add(workout.date);
    assert.ok(workout.notes === null || ["Push", "Pull", "Legs", "Upper"].includes(workout.notes));
    assert.ok(Array.isArray(workout.exercises) && workout.exercises.length > 0);
    const sessionNames = new Set();
    let setCount = 0;
    for (const exercise of workout.exercises) {
      assert.ok(names.has(exercise.exerciseName), `Noncanonical exercise: ${exercise.exerciseName}`);
      assert.ok(!sessionNames.has(exercise.exerciseName), `Duplicate exercise block: ${workout.date} ${exercise.exerciseName}`);
      sessionNames.add(exercise.exerciseName);
      usedNames.add(exercise.exerciseName);
      assert.ok(Array.isArray(exercise.sets) && exercise.sets.length > 0);
      exercise.sets.forEach((set, index) => {
        const location = `${workout.date} ${exercise.exerciseName} set ${index + 1}`;
        assert.equal(set.setNumber, index + 1, `Invalid set numbering: ${location}`);
        assert.ok(Number.isSafeInteger(set.reps) && set.reps > 0, `Invalid reps: ${location}`);
        if (set.sourceWeight === "bodyweight") {
          assert.equal(exercise.exerciseName, "Chest Dips");
          assert.equal(set.weight, null);
          bodyweightSets++;
        } else {
          assert.equal(set.sourceWeight, undefined);
          assert.ok(typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight > 0, `Invalid weight: ${location}`);
        }
        setCount++;
      });
    }
    exercisesPerformed += workout.exercises.length;
    totalSets += setCount;
    return { date: workout.date, label: workout.notes, exerciseCount: workout.exercises.length, setCount };
  });
  const dates = [...seenDates].sort();
  assert.deepEqual(workouts.map((workout) => workout.date), dates, "Workouts must be chronological.");
  return {
    totals: { workouts: workouts.length, exercisesPerformed, distinctExercises: usedNames.size, sets: totalSets, weightedSets: totalSets - bodyweightSets, bodyweightSets, earliestDate: dates[0], latestDate: dates.at(-1) },
    workouts,
    blockers,
  };
}

async function main() {
  assert.equal(process.argv.length, 2, "This script accepts no arguments and supports preview only.");
  const source = await readFile(new URL("./historical-workouts.json", import.meta.url), "utf8");
  const canonical = JSON.parse(await readFile(new URL("./canonical-exercises.json", import.meta.url), "utf8"));
  const history = JSON.parse(source);
  const validation = validateHistory(history, canonical);
  nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), true);
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  let inTransaction = false;
  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    inTransaction = true;
    await client.query("SET LOCAL statement_timeout = '15s'");
    const { rows: catalog } = await client.query('SELECT id, name, "muscleGroup" FROM public."Exercise" ORDER BY name');
    const { rows: users } = await client.query('SELECT id FROM public."User" ORDER BY id');
    const { rows: [counts] } = await client.query('SELECT (SELECT COUNT(*)::int FROM public."Workout") AS workouts, (SELECT COUNT(*)::int FROM public."WorkoutSet") AS workout_sets');
    const { rows: [weightColumn] } = await client.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'WorkoutSet' AND column_name = 'weight'");
    const exerciseIds = new Map();
    for (const target of canonical) {
      const matches = catalog.filter((row) => row.name === target.name);
      assert.equal(matches.length, 1, `Missing or ambiguous canonical exercise: ${target.name} (${matches.length} matches)`);
      assert.equal(matches[0].muscleGroup, target.muscleGroup, `Muscle group mismatch: ${target.name}`);
      exerciseIds.set(target.name, matches[0].id);
    }
    assert.equal(catalog.length, 31, "Unexpected exercises remain in the database.");
    await client.query("ROLLBACK");
    inTransaction = false;

    const blockers = [...validation.blockers];
    if (validation.totals.bodyweightSets && weightColumn?.is_nullable !== "YES") {
      blockers.push("The database weight column must be nullable before bodyweight sets can be imported.");
    }
    if (users.length !== 1) blockers.push(`Workout.userId requires an explicit owner: found ${users.length} users. No owner selected.`);
    if (counts.workouts || counts.workout_sets) blockers.push("Workout data already exists. Duplicate/conflict review is required before any import.");
    const warnings = [
      "Date-only notes have no time or timezone. Proposed conversion is server-local noon, matching the existing API; confirm the execution timezone before a future import.",
      "2026-07-13 Pec Fly Machine weights 6, 7.5, 12.5 kg are substantially below surrounding entries; preserved exactly as supplied.",
      "2026-06-08 Straight-Bar Triceps Pushdown is one set of 35 reps at 25 kg; preserved exactly as supplied.",
      "One- and two-set exercise blocks are intentional transcriptions; no missing sets were inferred.",
      "Single-Arm Dumbbell Row has one supplied rep count per set; no left/right conversion or doubled sets are needed.",
    ];
    const preview = {
      mode: "READ ONLY PREVIEW — NOT AN EXECUTABLE IMPORT PAYLOAD",
      generatedAt: new Date().toISOString(),
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      readyForImport: blockers.length === 0,
      ...validation,
      blockers,
      warnings,
      databaseCounts: counts,
      canonicalExercisesResolved: exerciseIds.size,
      userCount: users.length,
      proposedUserId: users.length === 1 ? users[0].id : null,
      datePolicy: history.datePolicy,
      bodyweightPolicy: history.bodyweightPolicy,
      resolvedWorkouts: history.workouts.map((workout) => ({
        date: workout.date,
        notes: workout.notes,
        userId: users.length === 1 ? users[0].id : null,
        sets: workout.exercises.flatMap((exercise) => exercise.sets.map((set) => ({
          exerciseId: exerciseIds.get(exercise.exerciseName),
          exerciseName: exercise.exerciseName,
          ...set,
        }))),
      })),
    };
    const output = new URL("./historical-workouts.preview.json", import.meta.url);
    await writeFile(output, JSON.stringify(preview, null, 2) + "\n", { mode: 0o600 });
    const summary = { ...preview };
    delete summary.resolvedWorkouts;
    console.log(JSON.stringify({ ...summary, previewFile: fileURLToPath(output) }, null, 2));
  } finally {
    if (inTransaction) await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Historical preview failed${error.code ? ` (${error.code})` : ""}: ${error.message}`);
    process.exitCode = 1;
  });
}
