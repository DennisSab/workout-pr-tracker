import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { unauthorizedResponse } from "@/lib/api-responses";

// The exercise catalog is shared by every user, so it is read-only over HTTP.
// Catalog changes go through the reviewed scripts/sync-exercise-catalog.mjs
// workflow; without a POST export, Next.js answers POST with 405.
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const exercises = await prisma.exercise.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(exercises);
}
