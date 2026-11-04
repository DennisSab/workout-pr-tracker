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
  userId: string,
  workout: ParsedWorkoutPayload
) {
  return client.$transaction(async (transaction) => {
    await assertExerciseReferences(transaction, workout);

    const createdWorkout = await transaction.workout.create({
      data: {
        userId,
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
  userId: string,
  workoutId: string,
  workout: ParsedWorkoutPayload
) {
  return client.$transaction(async (transaction) => {
    const existingWorkout = await transaction.workout.findFirst({
      where: { id: workoutId, userId },
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

export async function deleteWorkout(
  client: TransactionalPrismaClient,
  userId: string,
  workoutId: string
) {
  return client.$transaction(async (transaction) => {
    const existingWorkout = await transaction.workout.findFirst({
      where: { id: workoutId, userId },
      select: { id: true },
    });
    if (!existingWorkout) throw new WorkoutNotFoundError();

    await transaction.workoutSet.deleteMany({ where: { workoutId } });
    await transaction.workout.delete({ where: { id: workoutId } });
  });
}

type WorkoutSetWrite = {
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number | null;
};

export async function createWorkoutSet(
  client: TransactionalPrismaClient,
  userId: string,
  set: WorkoutSetWrite
) {
  return client.$transaction(async (transaction) => {
    const workout = await transaction.workout.findFirst({
      where: { id: set.workoutId, userId },
      select: { id: true },
    });
    if (!workout) throw new WorkoutNotFoundError();

    const exercise = await transaction.exercise.findUnique({
      where: { id: set.exerciseId },
      select: { id: true },
    });
    if (!exercise) throw new InvalidExerciseReferencesError([set.exerciseId]);

    return transaction.workoutSet.create({ data: set });
  });
}
