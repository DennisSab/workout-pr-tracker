import prisma from "@/lib/prisma";
import { parseWorkoutPayload } from "@/lib/workout-validation";
import {
  createWorkout,
  InvalidExerciseReferencesError,
} from "@/lib/workout-write";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { NextResponse } from "next/server";

// ✅ GET ALL WORKOUTS
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const workouts = await prisma.workout.findMany({
    where: { userId },
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
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
    workout = await createWorkout(prisma, userId, parsedWorkout.data);
  } catch (error) {
    if (error instanceof InvalidExerciseReferencesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ success: true, workoutId: workout.id });
}
