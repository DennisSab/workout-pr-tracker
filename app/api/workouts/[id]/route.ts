import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await prisma.workoutSet.deleteMany({
      where: {
        workoutId: id,
      },
    });

    await prisma.workout.delete({
      where: {
        id,
      },
    });

    return NextResponse.redirect(new URL("/workouts", req.url));
  } catch (error) {
    console.error("Delete workout failed:", error);

    return NextResponse.redirect(new URL("/workouts", req.url));
  }
}