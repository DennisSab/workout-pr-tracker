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

type WorkoutRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  const workout = await prisma.workout.findFirst({
    where: { id, userId },
    include: {
      sets: {
        include: {
          exercise: true,
        },
        orderBy: {
          setNumber: "asc",
        },
      },
    },
  });

  if (!workout) {
    return NextResponse.json(
      { error: "Workout not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(workout);
}

export async function PUT(
  req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
      return NextResponse.json({ error: error.message }, { status: 404 });
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
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  try {
    await deleteWorkoutRecord(prisma, userId, id);
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return deleteWorkoutAndRedirect(req, context);
}

async function deleteWorkoutAndRedirect(
  req: Request,
  context: WorkoutRouteContext
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  try {
    await deleteWorkoutRecord(prisma, userId, id);
  } catch (error) {
    if (error instanceof WorkoutNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/workouts", req.url), 303);
}
