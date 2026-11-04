import prisma from "@/lib/prisma";
import { parseWorkoutPayload } from "@/lib/workout-validation";
import {
  createWorkout,
  InvalidExerciseReferencesError,
  WorkoutUserMissingError,
} from "@/lib/workout-write";
import { NextResponse } from "next/server";

// ✅ GET ALL WORKOUTS
export async function GET() {
  const workouts = await prisma.workout.findMany({
    include: {
      sets: {
        include: {
          exercise: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json(workouts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsedWorkout = parseWorkoutPayload(body);

  if (!parsedWorkout.success) {
    return NextResponse.json(
      { error: parsedWorkout.error },
      { status: parsedWorkout.status }
    );
  }

  let workout;
  try {
    workout = await createWorkout(prisma, parsedWorkout.data);
  } catch (error) {
    if (
      error instanceof InvalidExerciseReferencesError ||
      error instanceof WorkoutUserMissingError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ success: true, workoutId: workout.id });
}
