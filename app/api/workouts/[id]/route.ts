import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ FIX: await params
  const { id } = await context.params;

  // ✅ Delete related sets first
  await prisma.workoutSet.deleteMany({
    where: {
      workoutId: id,
    },
  });

  // ✅ Then delete workout
  await prisma.workout.delete({
    where: {
      id,
    },
  });

  return NextResponse.redirect("http://localhost:3000/workouts");
}