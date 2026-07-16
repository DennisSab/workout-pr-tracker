import prisma from "@/lib/prisma";
import { parseWorkoutPayload } from "@/lib/workout-validation";
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

  const user = await prisma.user.findFirst();

  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 400 });
  }

  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      notes: parsedWorkout.data.notes,
      date: parsedWorkout.data.date,
    },
  });

  await prisma.workoutSet.createMany({
    data: parsedWorkout.data.sets.map((set) => ({
      workoutId: workout.id,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
    })),
  });

  return NextResponse.json({ success: true, workoutId: workout.id });
}
