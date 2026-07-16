import Navbar from "@/components/ui/Navbar";
import ExerciseStatsGrid from "@/components/ui/exercise-details/ExerciseStatsGrid";
import WorkoutHistoryList from "@/components/ui/exercise-details/WorkoutHistoryList";
import prisma from "@/lib/prisma";
import {
  buildExerciseStats,
  groupWorkoutHistory,
} from "@/lib/exercise-details";
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
        orderBy: [
          {
            workout: {
              date: "desc",
            },
          },
          {
            setNumber: "asc",
          },
        ],
      },
    },
  });

  if (!exercise) {
    notFound();
  }

  const stats = buildExerciseStats(exercise.sets);
  const workoutHistory = groupWorkoutHistory(exercise.sets);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-900 p-6 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">{exercise.name}</h1>

          <p className="mt-2 text-gray-400">
            {exercise.muscleGroup}
          </p>

          <div className="mt-8">
            <ExerciseStatsGrid stats={stats} />
          </div>

          <div className="mt-8 rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="text-xl font-semibold">Workout History</h2>

            <WorkoutHistoryList workouts={workoutHistory} />
          </div>
        </div>
      </main>
    </>
  );
}
