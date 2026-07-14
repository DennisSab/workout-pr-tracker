import prisma from "@/lib/prisma";
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

// ✅ CREATE WORKOUT
export async function POST(req: Request) {
  const body = await req.json();
  const { date,notes, exercises } = body;

  const user = await prisma.user.findFirst();

  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 400 });
  }

  const validSets = exercises.flatMap((exerciseBlock: any) => {
    if (!exerciseBlock.exerciseId) return [];

    return exerciseBlock.sets
      .filter((set: any) => Number(set.weight) > 0 && Number(set.reps) > 0)
      .map((set: any, index: number) => ({
        exerciseId: exerciseBlock.exerciseId,
        setNumber: index + 1,
        reps: Number(set.reps),
        weight: Number(set.weight),
      }));
  });

  if (validSets.length === 0) {
    return NextResponse.json(
      { error: "No valid sets provided" },
      { status: 400 }
    );
  }

  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      notes: notes || "No notes",
      date: date ? new Date(`${date}T12:00:00`) : new Date(),
    },
  });

  await prisma.workoutSet.createMany({
    data: validSets.map((set: any) => ({
      workoutId: workout.id,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
    })),
  });

  return NextResponse.json({ success: true });
}