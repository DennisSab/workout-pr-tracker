import prisma from "@/lib/prisma";
import { readJsonBody } from "@/lib/api-responses";
import { NextResponse } from "next/server";
import { parseSetValues } from "@/lib/workout-validation";

export async function POST(req: Request) {
  const bodyResult = await readJsonBody(req);
  if (!bodyResult.success) {
    return bodyResult.response;
  }
  const body = bodyResult.data as Record<string, unknown>;
  const values = parseSetValues(body);
  if (!values || typeof body.workoutId !== "string" || !body.workoutId.trim() ||
      typeof body.exerciseId !== "string" || !body.exerciseId.trim() ||
      !Number.isSafeInteger(body.setNumber) || (body.setNumber as number) < 1) {
    return NextResponse.json({ error: "A workout, exercise, positive set number and reps, and a positive weight or explicit null for bodyweight are required." }, { status: 400 });
  }

  const set = await prisma.workoutSet.create({
    data: {
      workoutId: body.workoutId,
      exerciseId: body.exerciseId,
      setNumber: body.setNumber as number,
      ...values,
    },
  });

  return NextResponse.json(set);
}
