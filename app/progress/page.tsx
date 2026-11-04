import { buildProgressStats } from "@/lib/workout-progress";
import Navbar from "@/components/ui/Navbar";
import prisma from "@/lib/prisma";
import ExerciseCard from "@/components/ui/progress/ExerciseCard";
import { requirePageUserId } from "@/lib/auth-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getWorkouts(userId: string) {
  return prisma.workout.findMany({
    where: { userId },
    include: {
      sets: {
        include: {
          exercise: true,
        },
        orderBy: {
          setNumber: "asc",
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
}

export default async function ProgressPage() {
  const userId = await requirePageUserId();
  const workouts = await getWorkouts(userId);
  const exerciseStats = buildProgressStats(workouts);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-900 p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Progress</h1>

            <p className="mt-2 text-gray-400">
              Your exercise performance and training history.
            </p>
          </div>

          {exerciseStats.length === 0 ? (
            <div className="rounded-xl bg-gray-800 p-6 text-gray-400">
              No workout data yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {exerciseStats.map((exercise) => (
                <ExerciseCard
                  key={exercise.exerciseId}
                  exerciseId={exercise.exerciseId}
                  exerciseName={exercise.exerciseName}
                  personalRecord={exercise.personalRecord}
                  totalVolume={exercise.totalVolume}
                  totalSets={exercise.totalSets}
                  totalSessions={exercise.totalSessions}
                  lastTrained={exercise.lastTrained}
                  lastWorkout={exercise.lastWorkout}
                  previousWorkout={exercise.previousWorkout}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
