import prisma from "@/lib/prisma";
import { parseExercisePayload } from "@/lib/workout-validation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const parsedExercise = parseExercisePayload(body);

  if (!parsedExercise.success) {
    return NextResponse.json(
      { error: parsedExercise.error },
      { status: parsedExercise.status }
    );
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: parsedExercise.data.name,
      muscleGroup: parsedExercise.data.muscleGroup,
    },
  });

  return NextResponse.json(exercise);
}

export async function GET() {
  const exercises = await prisma.exercise.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(exercises);
}
