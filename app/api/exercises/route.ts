import prisma from "@/lib/prisma";
import { readJsonBody } from "@/lib/api-responses";
import { parseExercisePayload } from "@/lib/workout-validation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const result = await readJsonBody(req);
  if (!result.ok) {
    return result.response;
  }
  const body = result.body;
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
