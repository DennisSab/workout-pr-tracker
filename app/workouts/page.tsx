import Navbar from "@/components/ui/Navbar";
import WorkoutHistoryCard from "@/components/ui/workouts/WorkoutHistoryCard";
import prisma from "@/lib/prisma";
import { buildWorkoutHistory } from "@/lib/workout-history";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getWorkoutHistory() {
  const workouts = await prisma.workout.findMany({
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

  return buildWorkoutHistory(workouts);
}

export default async function WorkoutsPage() {
  const workouts = await getWorkoutHistory();

  return (
    <>
      <Navbar />
      <main className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Workout History</h1>

        <Link
          href="/workouts/new"
          className="mb-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          Create Workout
        </Link>

        {workouts.length === 0 ? (
          <div className="rounded-2xl bg-gray-800 p-6 text-gray-400">
            No workouts logged yet.
          </div>
        ) : (
          <div className="space-y-6">
            {workouts.map((workout) => (
              <WorkoutHistoryCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
