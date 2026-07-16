import prisma from "@/lib/prisma";
import { parseWorkoutPayload } from "@/lib/workout-validation";
import { NextResponse } from "next/server";

type WorkoutRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: Request,
  context: WorkoutRouteContext
) {
  const { id } = await context.params;

  const workout = await prisma.workout.findUnique({
    where: { id },
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
  const { id } = await context.params;
  const body = await req.json();
  const parsedWorkout = parseWorkoutPayload(body);

  if (!parsedWorkout.success) {
    return NextResponse.json(
      { error: parsedWorkout.error },
      { status: parsedWorkout.status }
    );
  }

  const existingWorkout = await prisma.workout.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingWorkout) {
    return NextResponse.json(
      { error: "Workout not found." },
      { status: 404 }
    );
  }

  await prisma.workout.update({
    where: { id },
    data: {
      date: parsedWorkout.data.date,
      notes: parsedWorkout.data.notes,
    },
  });

  await prisma.workoutSet.deleteMany({
    where: { workoutId: id },
  });

  await prisma.workoutSet.createMany({
    data: parsedWorkout.data.sets.map((set) => ({
      workoutId: id,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
    })),
  });

  return NextResponse.json({ success: true, workoutId: id });
}

export async function DELETE(
  _req: Request,
  context: WorkoutRouteContext
) {
  const { id } = await context.params;

  await prisma.workoutSet.deleteMany({
    where: { workoutId: id },
  });

  await prisma.workout.deleteMany({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return deleteWorkout(req, context);
}

async function deleteWorkout(
  req: Request,
  context: WorkoutRouteContext
) {
  const { id } = await context.params;

  await prisma.workoutSet.deleteMany({
    where: { workoutId: id },
  });

  await prisma.workout.deleteMany({
    where: { id },
  });

  return NextResponse.redirect(new URL("/workouts", req.url), 303);
}
