import prisma from "@/lib/prisma";
import { parseExercisePayload } from "@/lib/workout-validation";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const exercises = await prisma.exercise.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(exercises);
}
