import type { PrismaClient } from "@prisma/client";

type WorkoutReadClient = Pick<PrismaClient, "workout" | "exercise">;

export function listUserWorkouts(client: WorkoutReadClient, userId: string) {
  return client.workout.findMany({
    where: { userId },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setNumber: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });
}

export function findUserWorkout(
  client: WorkoutReadClient,
  userId: string,
  workoutId: string
) {
  return client.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setNumber: "asc" },
      },
    },
  });
}

export function listUserWorkoutDates(
  client: WorkoutReadClient,
  userId: string,
  start: Date,
  endExclusive: Date
) {
  return client.workout.findMany({
    where: { userId, date: { gte: start, lt: endExclusive } },
    select: { date: true },
  });
}

export function listUserProgressWorkouts(
  client: WorkoutReadClient,
  userId: string
) {
  return client.workout.findMany({
    where: { userId },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: { setNumber: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });
}

export function findUserExerciseDetails(
  client: WorkoutReadClient,
  userId: string,
  exerciseId: string
) {
  return client.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      sets: {
        where: { workout: { userId } },
        include: { workout: true },
        orderBy: [
          { workout: { date: "desc" } },
          { setNumber: "asc" },
        ],
      },
    },
  });
}
