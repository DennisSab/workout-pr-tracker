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

  const { notes, exercises } = body;

  const user = await prisma.user.findFirst();

  // ✅ Create workout
  const workout = await prisma.workout.create({
    data: {
      userId: user!.id,
      notes: notes || "No notes",
    },
  });

  // ✅ Loop through each exercise
  for (const exerciseBlock of exercises) {
    await prisma.workoutSet.createMany({
      data: exerciseBlock.sets.map((set: any) => ({
        workoutId: workout.id,
        exerciseId: exerciseBlock.exerciseId,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
      })),
    });
  }

  return NextResponse.json({ success: true });
}