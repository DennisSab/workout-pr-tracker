import type { Prisma } from "@prisma/client";
import type { ParsedWorkoutPayload } from "@/lib/workout-validation";

type TransactionalPrismaClient = {
  $transaction<T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>
  ): Promise<T>;
};

export class InvalidExerciseReferencesError extends Error {
  readonly exerciseIds: string[];

  constructor(exerciseIds: string[]) {
    super(`Unknown exercise ${exerciseIds.length === 1 ? "reference" : "references"}: ${exerciseIds.join(", ")}.`);
    this.name = "InvalidExerciseReferencesError";
    this.exerciseIds = exerciseIds;
  }
}

export class WorkoutUserMissingError extends Error {
  constructor() {
    super("No user found.");
    this.name = "WorkoutUserMissingError";
  }
}

export class WorkoutNotFoundError extends Error {
  constructor() {
    super("Workout not found.");
    this.name = "WorkoutNotFoundError";
  }
}

async function assertExerciseReferences(
  transaction: Prisma.TransactionClient,
  workout: ParsedWorkoutPayload
) {
  const exerciseIds = [...new Set(workout.sets.map((set) => set.exerciseId))];
  const exercises = await transaction.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true },
  });
  const existingIds = new Set(exercises.map((exercise) => exercise.id));
  const invalidIds = exerciseIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw new InvalidExerciseReferencesError(invalidIds);
  }
}

function setData(workoutId: string, workout: ParsedWorkoutPayload) {
  return workout.sets.map((set) => ({
    workoutId,
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    reps: set.reps,
    weight: set.weight,
  }));
}

export async function createWorkout(
  client: TransactionalPrismaClient,
  workout: ParsedWorkoutPayload
) {
  return client.$transaction(async (transaction) => {
    await assertExerciseReferences(transaction, workout);

    const user = await transaction.user.findFirst({ select: { id: true } });
    if (!user) throw new WorkoutUserMissingError();

    const createdWorkout = await transaction.workout.create({
      data: {
        userId: user.id,
        notes: workout.notes,
        date: workout.date,
      },
      select: { id: true },
    });

    await transaction.workoutSet.createMany({
      data: setData(createdWorkout.id, workout),
    });

    return createdWorkout;
  });
}

export async function updateWorkout(
  client: TransactionalPrismaClient,
  workoutId: string,
  workout: ParsedWorkoutPayload
) {
  return client.$transaction(async (transaction) => {
    const existingWorkout = await transaction.workout.findUnique({
      where: { id: workoutId },
      select: { id: true },
    });
    if (!existingWorkout) throw new WorkoutNotFoundError();

    await assertExerciseReferences(transaction, workout);

    await transaction.workout.update({
      where: { id: workoutId },
      data: {
        date: workout.date,
        notes: workout.notes,
      },
    });
    await transaction.workoutSet.deleteMany({ where: { workoutId } });
    await transaction.workoutSet.createMany({
      data: setData(workoutId, workout),
    });

    return existingWorkout;
  });
}
