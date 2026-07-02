import prisma from "@/lib/prisma";  


type Exercise = {
  id: string;
  name: string;
};

type WorkoutSet = {
  id: string;
  weight: number;
  reps: number;
  exercise: Exercise;
};

type Workout = {
  id: string;
  date: string;
  sets: WorkoutSet[];
};

// ✅ Fetch workouts
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

export default async function ProgressPage() {
  const workouts = await getWorkouts();

  // ✅ Build PR map (best weight ever per exercise)
  const exercisePR: Record<string, number> = {};

  workouts.forEach((workout) => {
    workout.sets.forEach((set) => {
      const name = set.exercise.name;

      if (!exercisePR[name] || set.weight > exercisePR[name]) {
        exercisePR[name] = set.weight;
      }
    });
  });

  return (
    <main className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Progress</h1>

      <div className="space-y-4">
        {Object.entries(exercisePR).map(([name, weight]) => (
          <div
            key={name}
            className="bg-gray-800 p-4 rounded-lg flex justify-between"
          >
            <span>{name}</span>
            <span className="text-green-400 font-bold">
              {weight}kg
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}