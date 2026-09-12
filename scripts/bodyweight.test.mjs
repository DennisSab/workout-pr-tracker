// Run with: node --experimental-strip-types --test scripts/bodyweight.test.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { parseSetValues, parseWorkoutPayload, buildWorkoutFormValues } = await import("../lib/workout-validation.ts");
const { formatWeight } = await import("../lib/formatters.ts");
const { buildExerciseStats } = await import("../lib/exercise-details.ts");
const { buildWorkoutHistory, buildGlobalPersonalRecords } = await import("../lib/workout-history.ts");
const { buildProgressStats } = await import("../lib/workout-progress.ts");

function workout(id, date, weights) {
  return {
    id, date: new Date(date), notes: null,
    sets: weights.map((weight, index) => ({
      id: `${id}-${index}`, workoutId: id, exerciseId: "exercise", setNumber: index + 1,
      weight, reps: 10, exercise: { id: "exercise", name: "Chest Dips", muscleGroup: "Chest" },
      workout: { id, date: new Date(date), notes: null },
    })),
  };
}

test("explicit null is bodyweight; blank, missing and zero are never bodyweight", () => {
  assert.deepEqual(parseSetValues({ weight: null, reps: "12" }), { weight: null, reps: 12 });
  assert.deepEqual(parseSetValues({ weight: "22.5", reps: "12" }), { weight: 22.5, reps: 12 });
  for (const weight of [undefined, "", " ", 0, "0", -1, NaN, Infinity, "bodyweight"]) {
    assert.equal(parseSetValues({ weight, reps: 12 }), null);
  }
  assert.equal(parseSetValues({ weight: null, reps: 0 }), null);
  assert.equal(parseSetValues({ weight: null, reps: 1.5 }), null);
});

test("create and edit payloads preserve bodyweight and weighted sets", () => {
  const saved = workout("one", "2026-06-08", [null, 22.5]);
  const form = buildWorkoutFormValues(saved);
  assert.equal(form.exercises[0].sets[0].weight, null);
  assert.equal(form.exercises[0].sets[1].weight, "22.5");
  const parsed = parseWorkoutPayload(JSON.parse(JSON.stringify(form)));
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data.sets.map(({ weight, reps, setNumber }) => ({ weight, reps, setNumber })), [
    { weight: null, reps: 10, setNumber: 1 }, { weight: 22.5, reps: 10, setNumber: 2 },
  ]);
  assert.equal(formatWeight(null), "Bodyweight");
  assert.equal(formatWeight(22.5), "22.5kg");
  assert.equal(formatWeight(25), "25kg");
});

test("bodyweight-only sessions count sets and sessions without kg PRs or volume", () => {
  const sessions = [workout("latest", "2026-06-10", [null, null]), workout("older", "2026-06-08", [null])];
  const details = buildExerciseStats(sessions.flatMap((session) => session.sets));
  assert.deepEqual(details, { personalRecord: null, totalSets: 3, totalSessions: 2, totalVolume: null });
  assert.equal(buildGlobalPersonalRecords(sessions).size, 0);
  assert.ok(buildWorkoutHistory(sessions).every((session) => session.exercises.every((exercise) =>
    exercise.personalRecord === null && exercise.sets.every((set) => !set.isPersonalRecord && set.performanceLabel === "Bodyweight x 10"))));
  const [progress] = buildProgressStats(sessions);
  assert.equal(progress.personalRecord, null);
  assert.equal(progress.totalVolume, null);
  assert.equal(progress.totalSets, 3);
  assert.equal(progress.totalSessions, 2);
  assert.equal(progress.lastWorkout.weight, null);
  assert.equal(progress.previousWorkout.weight, null);
});

test("mixed sessions exclude nulls from weighted records, volume, and best weighted set", () => {
  const sessions = [workout("latest", "2026-06-10", [null, 25, null, 20]), workout("older", "2026-06-08", [30, null])];
  const details = buildExerciseStats(sessions.flatMap((session) => session.sets));
  assert.deepEqual(details, { personalRecord: 30, totalSets: 6, totalSessions: 2, totalVolume: 750 });
  const [progress] = buildProgressStats(sessions);
  assert.equal(progress.personalRecord, 30);
  assert.equal(progress.totalVolume, 750);
  assert.equal(progress.lastWorkout.weight, 25);
  assert.equal(progress.previousWorkout.weight, 30);
  const sets = buildWorkoutHistory(sessions).flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets));
  assert.deepEqual(sets.filter((set) => set.isPersonalRecord).map((set) => set.weight), [30]);
});

test("weighted-only PR, volume and latest/previous performance stay unchanged", () => {
  const sessions = [workout("latest", "2026-06-10", [20, 25, 22.5]), workout("older", "2026-06-08", [15, 20])];
  const [progress] = buildProgressStats(sessions);
  assert.equal(progress.personalRecord, 25);
  assert.equal(progress.totalVolume, 1025);
  assert.equal(progress.totalSets, 5);
  assert.equal(progress.totalSessions, 2);
  assert.equal(progress.lastWorkout.weight, 25);
  assert.equal(progress.previousWorkout.weight, 20);
  assert.equal(buildExerciseStats(sessions.flatMap((session) => session.sets)).totalVolume, 1025);
});
