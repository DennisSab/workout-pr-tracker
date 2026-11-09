import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseSetValues } from "@/lib/workout-validation";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import {
  createWorkoutSet,
  InvalidExerciseReferencesError,
  WorkoutNotFoundError,
} from "@/lib/workout-write";
import {
  unauthorizedResponse,
  workoutNotFoundResponse,
} from "@/lib/api-responses";
import { rejectCrossOriginRequest } from "@/lib/request-origin";

export async function POST(req: Request) {
  const crossOrigin = rejectCrossOriginRequest(req);
  if (crossOrigin) {
    return crossOrigin;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const body = await req.json();
  const values = parseSetValues(body);
  if (!values || typeof body.workoutId !== "string" || !body.workoutId.trim() ||
      typeof body.exerciseId !== "string" || !body.exerciseId.trim() ||
      !Number.isSafeInteger(body.setNumber) || body.setNumber < 1) {
    return NextResponse.json({ error: "A workout, exercise, positive set number and reps, and a positive weight or explicit null for bodyweight are required." }, { status: 400 });
  }

  try {
    const set = await createWorkoutSet(prisma, userId, {
      workoutId: body.workoutId,
      exerciseId: body.exerciseId,
      setNumber: body.setNumber,
      ...values,
    });

    return NextResponse.json(set);
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return workoutNotFoundResponse(error.message);
    }
    if (error instanceof InvalidExerciseReferencesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
