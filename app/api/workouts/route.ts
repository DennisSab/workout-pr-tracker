import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type SetInput = {
  weight: number;
  reps: number;
};

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
  });

  return NextResponse.json(workouts);
}

// ✅ CREATE WORKOUT
export async function POST(req: Request) {
  const body = await req.json();

  const { notes, exerciseId, sets } = body;

  const user = await prisma.user.findFirst();

  // ✅ Create workout
  const workout = await prisma.workout.create({
    data: {
      userId: user!.id,
      notes: notes || "No notes",
    },
  });

  // ✅ Create sets linked to workout + exercise
  await prisma.workoutSet.createMany({
    data: sets.map((set: SetInput, index: number) => ({
      workoutId: workout.id,
      exerciseId: exerciseId,
      setNumber: index + 1,
      reps: set.reps,
      weight: set.weight,
    })),
  });

  return NextResponse.json({ success: true });
}