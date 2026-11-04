import assert from "node:assert/strict";
import { access } from "node:fs/promises";
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

const { getLocalCalendarDate } = await import("../lib/local-date.ts");
const { parseWorkoutPayload } = await import("../lib/workout-validation.ts");
const { userIdFromSession } = await import("../lib/session-user.ts");
const {
  createWorkout,
  createWorkoutSet,
  deleteWorkout,
  InvalidExerciseReferencesError,
  updateWorkout,
  WorkoutNotFoundError,
} = await import("../lib/workout-write.ts");

function validWorkout(exerciseId = "exercise-1") {
  return {
    date: new Date("2026-11-03T12:00:00"),
    notes: "Foundation",
    sets: [
      { exerciseId, setNumber: 1, reps: 8, weight: 50 },
      { exerciseId, setNumber: 2, reps: 10, weight: null },
    ],
  };
}

function transactionalClient({ failSetWrite = false } = {}) {
  let state = {
    workouts: [{ id: "existing", userId: "user-1", notes: "Before", date: new Date("2026-11-01T12:00:00") }],
    sets: [{ id: "old-set", workoutId: "existing", exerciseId: "exercise-1", setNumber: 1, reps: 5, weight: 40 }],
  };
  let transactionCalls = 0;

  return {
    get state() {
      return state;
    },
    get transactionCalls() {
      return transactionCalls;
    },
    async $transaction(callback) {
      transactionCalls += 1;
      const pending = structuredClone(state);
      const transaction = {
        exercise: {
          async findMany({ where }) {
            return where.id.in
              .filter((id) => id === "exercise-1")
              .map((id) => ({ id }));
          },
          async findUnique({ where }) {
            return where.id === "exercise-1" ? { id: where.id } : null;
          },
        },
        workout: {
          async create({ data }) {
            const created = { id: "created", ...data };
            pending.workouts.push(created);
            return { id: created.id };
          },
          async findFirst({ where }) {
            const workout = pending.workouts.find(
              ({ id, userId }) => id === where.id && userId === where.userId
            );
            return workout ? { id: workout.id } : null;
          },
          async update({ where, data }) {
            Object.assign(
              pending.workouts.find(({ id }) => id === where.id),
              data
            );
          },
          async delete({ where }) {
            pending.workouts = pending.workouts.filter(
              ({ id }) => id !== where.id
            );
          },
        },
        workoutSet: {
          async deleteMany({ where }) {
            pending.sets = pending.sets.filter(
              ({ workoutId }) => workoutId !== where.workoutId
            );
          },
          async createMany({ data }) {
            if (failSetWrite) throw new Error("simulated set write failure");
            pending.sets.push(
              ...data.map((set, index) => ({ id: `new-set-${index}`, ...set }))
            );
          },
          async create({ data }) {
            const created = { id: "created-set", ...data };
            pending.sets.push(created);
            return created;
          },
        },
      };

      const result = await callback(transaction);
      state = pending;
      return result;
    },
  };
}

test("malformed sets reject the entire workout with a specific 400 error", () => {
  const parsed = parseWorkoutPayload({
    date: "2026-11-03",
    exercises: [
      { exerciseId: "exercise-1", sets: [{ reps: "8", weight: "50" }] },
      { exerciseId: "exercise-2", sets: [{ reps: "", weight: null }] },
    ],
  });

  assert.equal(parsed.success, false);
  assert.equal(parsed.status, 400);
  assert.match(parsed.error, /Exercise 2, set 1/);
});

test("unknown exercise references reject before create writes", async () => {
  const client = transactionalClient();

  await assert.rejects(
    createWorkout(client, "user-1", validWorkout("unknown")),
    (error) =>
      error instanceof InvalidExerciseReferencesError &&
      error.exerciseIds[0] === "unknown"
  );
  assert.equal(client.transactionCalls, 1);
  assert.equal(client.state.workouts.length, 1);
  assert.equal(client.state.sets.length, 1);
});

test("workout creation rolls back metadata when set creation fails", async () => {
  const client = transactionalClient({ failSetWrite: true });

  await assert.rejects(
    createWorkout(client, "user-1", validWorkout()),
    /simulated/
  );
  assert.equal(client.transactionCalls, 1);
  assert.deepEqual(client.state.workouts.map(({ id }) => id), ["existing"]);
  assert.deepEqual(client.state.sets.map(({ id }) => id), ["old-set"]);
});

test("workout creation commits weighted and bodyweight sets together", async () => {
  const client = transactionalClient();

  const created = await createWorkout(client, "authenticated-user", validWorkout());
  assert.equal(created.id, "created");
  assert.equal(client.transactionCalls, 1);
  assert.equal(client.state.workouts.length, 2);
  assert.equal(client.state.workouts[1].userId, "authenticated-user");
  assert.deepEqual(
    client.state.sets
      .filter(({ workoutId }) => workoutId === "created")
      .map(({ weight }) => weight),
    [50, null]
  );
});

test("workout editing rolls back metadata and deleted sets when replacement fails", async () => {
  const client = transactionalClient({ failSetWrite: true });

  await assert.rejects(
    updateWorkout(client, "user-1", "existing", validWorkout()),
    /simulated/
  );
  assert.equal(client.transactionCalls, 1);
  assert.equal(client.state.workouts[0].notes, "Before");
  assert.deepEqual(client.state.sets.map(({ id }) => id), ["old-set"]);
});

test("cross-user workout updates return not found without changing data", async () => {
  const client = transactionalClient();

  await assert.rejects(
    updateWorkout(client, "user-2", "existing", validWorkout()),
    (error) => error instanceof WorkoutNotFoundError
  );
  assert.equal(client.state.workouts[0].notes, "Before");
  assert.deepEqual(client.state.sets.map(({ id }) => id), ["old-set"]);
});

test("deleting requires ownership and removes an owned workout transactionally", async () => {
  const deniedClient = transactionalClient();
  await assert.rejects(
    deleteWorkout(deniedClient, "user-2", "existing"),
    (error) => error instanceof WorkoutNotFoundError
  );
  assert.equal(deniedClient.state.workouts.length, 1);

  const ownerClient = transactionalClient();
  await deleteWorkout(ownerClient, "user-1", "existing");
  assert.deepEqual(ownerClient.state.workouts, []);
  assert.deepEqual(ownerClient.state.sets, []);
});

test("set creation requires an owned workout and a valid exercise", async () => {
  const client = transactionalClient();
  const input = {
    workoutId: "existing",
    exerciseId: "exercise-1",
    setNumber: 2,
    reps: 8,
    weight: null,
  };

  await assert.rejects(
    createWorkoutSet(client, "user-2", input),
    (error) => error instanceof WorkoutNotFoundError
  );
  const created = await createWorkoutSet(client, "user-1", input);
  assert.equal(created.weight, null);
  assert.equal(client.state.sets.length, 2);
});

test("session resolution distinguishes anonymous and authenticated requests", async () => {
  assert.equal(userIdFromSession(null), null);
  assert.equal(userIdFromSession({ user: { id: "user-1" } }), "user-1");
});

test("local calendar dates use local date fields instead of UTC serialization", () => {
  assert.equal(getLocalCalendarDate(new Date(2026, 10, 3, 0, 30)), "2026-11-03");
});

test("the unsafe test route is absent", async () => {
  await assert.rejects(
    access(new URL("../app/api/test/route.ts", import.meta.url)),
    (error) => error?.code === "ENOENT"
  );
});
