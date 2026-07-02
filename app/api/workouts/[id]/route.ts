import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
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