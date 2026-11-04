import prisma from "@/lib/prisma";
import { parseWorkoutPayload } from "@/lib/workout-validation";
import {
  deleteWorkout as deleteWorkoutRecord,
  InvalidExerciseReferencesError,
  updateWorkout,
  WorkoutNotFoundError,
} from "@/lib/workout-write";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { NextResponse } from "next/server";
import { findUserWorkout } from "@/lib/workout-read";
import {
  unauthorizedResponse,
  workoutNotFoundResponse,
} from "@/lib/api-responses";

type WorkoutRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }
  const { id } = await context.params;

  const workout = await findUserWorkout(prisma, userId, id);

  if (!workout) {
    return workoutNotFoundResponse();
  }

  return NextResponse.json(workout);
}

export async function PUT(
  req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }
  const { id } = await context.params;
  const body = await req.json();
  const parsedWorkout = parseWorkoutPayload(body);

  if (!parsedWorkout.success) {
    return NextResponse.json(
      { error: parsedWorkout.error },
      { status: parsedWorkout.status }
    );
  }

  try {
    await updateWorkout(prisma, userId, id, parsedWorkout.data);
  } catch (error) {
    if (error instanceof InvalidExerciseReferencesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof WorkoutNotFoundError) {
      return workoutNotFoundResponse(error.message);
    }
    throw error;
  }

  return NextResponse.json({ success: true, workoutId: id });
}

export async function DELETE(
  _req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }
  const { id } = await context.params;

  try {
    await deleteWorkoutRecord(prisma, userId, id);
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return workoutNotFoundResponse(error.message);
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
