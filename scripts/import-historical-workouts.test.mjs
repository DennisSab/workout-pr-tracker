// Run: node scripts/import-historical-workouts.test.mjs (local data only; no database access).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateApprovedInput, verifyStoredRows } from "./import-historical-workouts.mjs";

const source = await readFile(new URL("./historical-workouts.json", import.meta.url), "utf8");
const canonical = JSON.parse(await readFile(new URL("./canonical-exercises.json", import.meta.url), "utf8"));
const preview = JSON.parse(await readFile(new URL("./historical-workouts.preview.json", import.meta.url), "utf8"));
function storedRows() {
  const workouts = preview.resolvedWorkouts.map((workout, index) => ({ id: `workout-${index}`, date: workout.date, notes: workout.notes, userId: workout.userId }));
  const sets = preview.resolvedWorkouts.flatMap((workout, index) => workout.sets.map((set) => ({ workoutId: workouts[index].id, exerciseId: set.exerciseId, setNumber: set.setNumber, reps: set.reps, weight: set.weight })));
  return { workouts, sets };
}

test("approved source and preview have exactly 24 workouts, 345 sets and 31 resolved IDs", () => {
  const result = validateApprovedInput(source, canonical, preview);
  assert.equal(result.validation.totals.workouts, 24);
  assert.equal(result.validation.totals.sets, 345);
  assert.equal(result.ids.size, 31);
});

test("changed source, preview weights, dates and exercise IDs abort", () => {
  assert.throws(() => validateApprovedInput(source + " ", canonical, preview));
  for (const mutate of [
    (p) => { p.resolvedWorkouts[0].sets[0].weight = 100; },
    (p) => { p.resolvedWorkouts[0].date = "2026-06-09"; },
    (p) => { p.resolvedWorkouts[0].sets[0].exerciseId = "different-id"; },
    (p) => { p.readyForImport = false; },
  ]) {
    const changed = structuredClone(preview); mutate(changed);
    assert.throws(() => validateApprovedInput(source, canonical, changed));
  }
});

test("complete readback preserves every approved field and per-workout count", () => {
  const { workouts, sets } = storedRows();
  const report = verifyStoredRows(workouts, sets, preview);
  assert.equal(report.verification, "PASS");
  assert.equal(report.bodyweightSets, 3);
  assert.equal(report.summaries.reduce((sum, row) => sum + row.exerciseCount, 0), 121);
});

test("readback rejects duplicates, missing sets, wrong owners, swapped ordering and converted bodyweight", () => {
  for (const mutate of [
    ({ workouts }) => { workouts[1].date = workouts[0].date; },
    ({ workouts }) => { workouts[0].userId = "wrong-user"; },
    ({ workouts }) => { workouts[0].notes = "Push"; },
    ({ sets }) => { sets.pop(); },
    ({ sets }) => { sets[0].reps++; },
    ({ sets }) => { sets[0].exerciseId = "wrong-exercise"; },
    ({ sets }) => { sets[0].setNumber = 2; },
    ({ sets }) => { sets.find((set) => set.weight === null).weight = 0; },
  ]) {
    const rows = storedRows(); mutate(rows);
    assert.throws(() => verifyStoredRows(rows.workouts, rows.sets, preview));
  }
});
