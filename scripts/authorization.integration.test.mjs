import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context
      );
    }
    return nextResolve(specifier, context);
  },
});

const { buildWorkoutCalendar } = await import("../lib/workout-calendar.ts");
const { buildWorkoutHistory } = await import("../lib/workout-history.ts");
const { buildProgressStats } = await import("../lib/workout-progress.ts");
const {
  unauthorizedResponse,
  workoutNotFoundResponse,
} = await import("../lib/api-responses.ts");
const {
  findUserExerciseDetails,
  findUserWorkout,
  listUserProgressWorkouts,
  listUserWorkoutDates,
  listUserWorkouts,
} = await import("../lib/workout-read.ts");
const { userIdFromSession } = await import("../lib/session-user.ts");
const {
  createWorkout,
  createWorkoutSet,
  deleteWorkout,
  updateWorkout,
  WorkoutNotFoundError,
} = await import("../lib/workout-write.ts");

const USER_A = "user-a";
const USER_B = "user-b";

function initialState() {
  return {
    exercises: [
      { id: "bench", name: "Bench Press", muscleGroup: "Chest" },
      { id: "pullup", name: "Pull Up", muscleGroup: "Back" },
    ],
    workouts: [
      {
        id: "workout-a",
        userId: USER_A,
        date: new Date(2026, 10, 2, 12),
        notes: "A only",
      },
      {
        id: "workout-b",
        userId: USER_B,
        date: new Date(2026, 10, 3, 12),
        notes: "B only",
      },
    ],
    sets: [
      {
        id: "set-a-weighted",
        workoutId: "workout-a",
        exerciseId: "bench",
        setNumber: 1,
        reps: 5,
        weight: 80,
      },
      {
        id: "set-a-bodyweight",
        workoutId: "workout-a",
        exerciseId: "pullup",
        setNumber: 1,
        reps: 8,
        weight: null,
      },
      {
        id: "set-b",
        workoutId: "workout-b",
        exerciseId: "bench",
        setNumber: 1,
        reps: 3,
        weight: 120,
      },
    ],
  };
}

function isolatedClient({ failSetWrite = false } = {}) {
  let state = structuredClone(initialState());
  let nextId = 1;

  function enrichedWorkout(workout, source = state) {
    return {
      ...workout,
      sets: source.sets
        .filter((set) => set.workoutId === workout.id)
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((set) => ({
          ...set,
          exercise: source.exercises.find(({ id }) => id === set.exerciseId),
        })),
    };
  }

  function delegates(source) {
    return {
      exercise: {
        async findMany({ where } = {}) {
          const ids = where?.id?.in;
          return source.exercises
            .filter((exercise) => !ids || ids.includes(exercise.id))
            .map(({ id }) => ({ id }));
        },
        async findUnique({ where, include }) {
          const exercise = source.exercises.find(({ id }) => id === where.id);
          if (!exercise) return null;
          if (!include?.sets) return { id: exercise.id };

          const userId = include.sets.where.workout.userId;
          return {
            ...exercise,
            sets: source.sets
              .filter((set) => set.exerciseId === exercise.id)
              .filter((set) =>
                source.workouts.some(
                  (workout) =>
                    workout.id === set.workoutId && workout.userId === userId
                )
              )
              .map((set) => ({
                ...set,
                workout: source.workouts.find(({ id }) => id === set.workoutId),
              })),
          };
        },
      },
      workout: {
        async findMany({ where = {} }) {
          return source.workouts
            .filter((workout) => !where.userId || workout.userId === where.userId)
            .filter((workout) => !where.date?.gte || workout.date >= where.date.gte)
            .filter((workout) => !where.date?.lt || workout.date < where.date.lt)
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((workout) =>
              where.date ? { date: workout.date } : enrichedWorkout(workout, source)
            );
        },
        async findFirst({ where }) {
          const workout = source.workouts.find(
            ({ id, userId }) => id === where.id && userId === where.userId
          );
          return workout ? enrichedWorkout(workout, source) : null;
        },
        async create({ data }) {
          const workout = { id: `created-${nextId++}`, ...data };
          source.workouts.push(workout);
          return { id: workout.id };
        },
        async update({ where, data }) {
          Object.assign(
            source.workouts.find(({ id }) => id === where.id),
            data
          );
        },
        async delete({ where }) {
          source.workouts = source.workouts.filter(({ id }) => id !== where.id);
        },
      },
      workoutSet: {
        async deleteMany({ where }) {
          source.sets = source.sets.filter(
            ({ workoutId }) => workoutId !== where.workoutId
          );
        },
        async createMany({ data }) {
          if (failSetWrite) throw new Error("simulated set write failure");
          source.sets.push(
            ...data.map((set) => ({ id: `set-${nextId++}`, ...set }))
          );
        },
        async create({ data }) {
          const set = { id: `set-${nextId++}`, ...data };
          source.sets.push(set);
          return set;
        },
      },
    };
  }

  return {
    get state() {
      return structuredClone(state);
    },
    exercise: {
      findMany(args) {
        return delegates(state).exercise.findMany(args);
      },
      findUnique(args) {
        return delegates(state).exercise.findUnique(args);
      },
    },
    workout: {
      findMany(args) {
        return delegates(state).workout.findMany(args);
      },
      findFirst(args) {
        return delegates(state).workout.findFirst(args);
      },
    },
    async $transaction(callback) {
      const pending = structuredClone(state);
      const result = await callback(delegates(pending));
      state = pending;
      return result;
    },
  };
}

function workoutInput(overrides = {}) {
  return {
    date: new Date(2026, 10, 4, 12),
    notes: "Created by A",
    sets: [
      { exerciseId: "bench", setNumber: 1, reps: 6, weight: 85 },
      { exerciseId: "pullup", setNumber: 1, reps: 9, weight: null },
    ],
    ...overrides,
  };
}

test("anonymous sessions have no API identity", () => {
  assert.equal(userIdFromSession(null), null);
  assert.equal(userIdFromSession({}), null);
  assert.equal(unauthorizedResponse().status, 401);
  assert.equal(workoutNotFoundResponse().status, 404);
});

test("User A can create and read only their own weighted/bodyweight workout", async () => {
  const client = isolatedClient();
  const maliciousInput = workoutInput({ userId: USER_B });
  const created = await createWorkout(client, USER_A, maliciousInput);

  const stored = client.state.workouts.find(({ id }) => id === created.id);
  assert.equal(stored.userId, USER_A);

  const ownWorkout = await findUserWorkout(client, USER_A, created.id);
  assert.deepEqual(ownWorkout.sets.map(({ weight }) => weight), [85, null]);
  assert.equal(await findUserWorkout(client, USER_B, created.id), null);
});

test("User A can edit and delete their own workout", async () => {
  const client = isolatedClient();
  await updateWorkout(
    client,
    USER_A,
    "workout-a",
    workoutInput({ notes: "A edited" })
  );
  assert.equal(
    client.state.workouts.find(({ id }) => id === "workout-a").notes,
    "A edited"
  );

  await deleteWorkout(client, USER_A, "workout-a");
  assert.equal(client.state.workouts.some(({ id }) => id === "workout-a"), false);
  assert.equal(client.state.sets.some(({ workoutId }) => workoutId === "workout-a"), false);
});

test("User B cannot read, edit, delete, or add sets to User A's workout", async () => {
  const client = isolatedClient();
  const before = client.state;
  assert.equal(await findUserWorkout(client, USER_B, "workout-a"), null);

  for (const operation of [
    () => updateWorkout(client, USER_B, "workout-a", workoutInput()),
    () => deleteWorkout(client, USER_B, "workout-a"),
    () =>
      createWorkoutSet(client, USER_B, {
        workoutId: "workout-a",
        exerciseId: "bench",
        setNumber: 2,
        reps: 5,
        weight: 90,
      }),
  ]) {
    await assert.rejects(operation, (error) => error instanceof WorkoutNotFoundError);
  }

  assert.deepEqual(client.state, before);
});

test("the workout item route exposes no legacy destructive POST handler", async () => {
  const source = await readFile(
    new URL("../app/api/workouts/[id]/route.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /export async function POST\s*\(/);
  assert.match(source, /export async function DELETE\s*\(/);
});

test("dashboard, history, calendar, progress, and exercise details isolate users", async () => {
  const client = isolatedClient();
  const start = new Date(2026, 10, 1);
  const end = new Date(2026, 10, 5);

  const dates = await listUserWorkoutDates(client, USER_A, start, end);
  assert.deepEqual(dates.map(({ date }) => date.getDate()), [2]);
  assert.equal(buildWorkoutCalendar(dates.map(({ date }) => date), new Date(2026, 10, 4)).gymDays, 1);

  const historyRows = await listUserWorkouts(client, USER_A);
  const history = buildWorkoutHistory(historyRows);
  assert.deepEqual(history.map(({ id }) => id), ["workout-a"]);

  const progressRows = await listUserProgressWorkouts(client, USER_A);
  const progress = buildProgressStats(progressRows);
  assert.equal(progress.find(({ exerciseId }) => exerciseId === "bench").personalRecord, 80);

  const exercise = await findUserExerciseDetails(client, USER_A, "bench");
  assert.deepEqual(exercise.sets.map(({ workoutId }) => workoutId), ["workout-a"]);
});

test("failed replacement set writes roll back owner metadata and sets", async () => {
  const client = isolatedClient({ failSetWrite: true });
  await assert.rejects(
    updateWorkout(client, USER_A, "workout-a", workoutInput({ notes: "must roll back" })),
    /simulated set write failure/
  );

  const state = client.state;
  assert.equal(state.workouts.find(({ id }) => id === "workout-a").notes, "A only");
  assert.deepEqual(
    state.sets
      .filter(({ workoutId }) => workoutId === "workout-a")
      .map(({ id }) => id),
    ["set-a-weighted", "set-a-bodyweight"]
  );
});
