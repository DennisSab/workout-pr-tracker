import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const exercise = await prisma.exercise.create({
    data: {
      name: body.name,
      muscleGroup: body.muscleGroup,
    },
  });

  return NextResponse.json(exercise);
}



export async function GET() {
  const exercises = await prisma.exercise.findMany();
  return NextResponse.json(exercises);
}
