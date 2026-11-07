import prisma from "@/lib/prisma";
import { readJsonBody } from "@/lib/api-responses";
import { parseExercisePayload } from "@/lib/workout-validation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const bodyResult = await readJsonBody(req);
  if (!bodyResult.success) {
    return bodyResult.response;
  }
  const parsedExercise = parseExercisePayload(bodyResult.data);

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
