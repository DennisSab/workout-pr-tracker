import Navbar from "@/components/ui/Navbar";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExercisePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExercisePage({
  params,
}: ExercisePageProps) {
  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: {
      id,
    },
    include: {
      sets: {
        include: {
          workout: true,
        },
        orderBy: {
          workout: {
            date: "desc",
          },
        },
      },
    },
  });

  if (!exercise) {
    notFound();
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-900 p-6 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">{exercise.name}</h1>

          <p className="mt-2 text-gray-400">
            {exercise.muscleGroup}
          </p>

          <div className="mt-8 rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="text-xl font-semibold">Workout History</h2>

            {exercise.sets.length === 0 ? (
              <p className="mt-4 text-gray-400">
                No workout history for this exercise.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {exercise.sets.map((set) => (
                  <div
                    key={set.id}
                    className="rounded-xl bg-gray-700 p-4"
                  >
                    <p className="font-semibold">
                      {set.weight} kg × {set.reps} reps
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {set.workout.date.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}