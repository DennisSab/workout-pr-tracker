import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const set = await prisma.workoutSet.create({
    data: {
      workoutId: body.workoutId,
      exerciseId: body.exerciseId,
      setNumber: body.setNumber,
      reps: body.reps,
      weight: body.weight,
    },
  });

  return NextResponse.json(set);
}