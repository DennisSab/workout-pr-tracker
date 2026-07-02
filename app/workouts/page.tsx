import Link from "next/link";
import prisma from "@/lib/prisma";
import Navbar from "@/components/ui/Navbar";

export const dynamic = "force-dynamic"; // Ensure the route is treated as dynamic
export const revalidate = 0;
export const fetchCache ="force-no-store"; // Ensure the route runs in the edge runtime


type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
};

type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
  setNumber: number;
  exercise: Exercise;
};

type Workout = {
  id: string;
  date: string;
  notes: string | null;
  sets: WorkoutSet[];
};

// ✅ Fetch workouts from your API
async function getWorkouts(): Promise<Workout[]> {
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

  return workouts.map((workout) => ({
    ...workout,
    date: workout.date.toISOString(),
    notes: workout.notes ?? "",
  }));
}

// ✅ Page Component
export default async function WorkoutsPage() {
  const workouts = await getWorkouts();

  // ✅ GLOBAL PR MAP (ALL WORKOUTS)
  const globalPR: Record<string, number> = {};

  workouts.forEach((workout) => {
    workout.sets.forEach((set) => {
      const name = set.exercise.name;

      if (!globalPR[name] || set.weight > globalPR[name]) {
        globalPR[name] = set.weight;
      }
    });
  });

  return (
    <>
    <Navbar />
      <main className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Workout History</h1>

        {/* Create Workout Button */}
        <Link href="/workouts/new">
          <button className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
            Create Workout
          </button>
        </Link>

        <div className="space-y-6">
          {workouts.map((workout) => {

            // ✅ GROUP SETS BY EXERCISE
            const groupedSets = workout.sets.reduce(
              (acc: Record<string, WorkoutSet[]>, set) => {
                const name = set.exercise.name;

                if (!acc[name]) acc[name] = [];

                acc[name].push(set);
                return acc;
              },
              {}
            );

            return (
              <div key={workout.id} className="bg-gray-800 p-4 rounded-lg">

                {/* Workout Header */}
                <h2 className="text-xl font-semibold mb-2">
                  {new Date(workout.date).toLocaleDateString()}
                </h2>

                <p className="text-gray-400 mb-4">
                  {workout.notes || "No notes"}
                </p>

                {/* ✅ GROUPED SETS UI */}
                <div className="space-y-4">
                  {Object.entries(groupedSets).map(([exerciseName, sets]) => (
                    <div key={exerciseName}>

                      {/* Exercise Title */}
                      <h3 className="font-semibold text-lg">
                        {exerciseName}
                        <span className="ml-2 text-green-400 text-sm">
                          PR: {globalPR[exerciseName]}kg
                        </span>
                      </h3>

                      {/* Sets */}
                      {sets.map((set, index) => {
                      const isPR = set.weight === globalPR[exerciseName];

                      return (
                        <div key={set.id} className="ml-4">
                          <p className={isPR ? "text-green-400 font-bold" : ""}>
                            <span className="text-gray-400">
                              Set {index + 1}:
                            </span>{" "}
                            {set.weight}kg x {set.reps}
                            {isPR && " 💥"}
                          </p>
                        </div>
                      );
                    })}

                    </div>
                  ))}
                </div>

                {/* ✅ DELETE BUTTON */}
                <form action={`/api/workouts/${workout.id}`} method="POST">
                  <button
                    type="submit"
                    className="mt-3 text-red-500 hover:text-red-400"
                  >
                    Delete Workout
                  </button>
                </form>

              </div>
            );
          })}
        </div>
      </main>
    </> 
  );
}