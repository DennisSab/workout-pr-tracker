import Link from "next/link";

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
  notes: string;
  sets: WorkoutSet[];
};

// ✅ Fetch workouts from your API
async function getWorkouts(): Promise<Workout[]> {
  const res = await fetch("http://localhost:3000/api/workouts", {
    cache: "no-store", // always fetch fresh data
  });

  return res.json();
}

// ✅ Page Component
export default async function WorkoutsPage() {
  const workouts = await getWorkouts();

  return (
    <main className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Workout History</h1>

      
      <Link href="/workouts/new">
        <button className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
          Create Workout
        </button>
      </Link>


      <div className="space-y-6">
        {workouts.map((workout) => (
          <div key={workout.id} className="bg-gray-800 p-4 rounded-lg">
            
            {/* Workout Header */}
            <h2 className="text-xl font-semibold mb-2">
              {new Date(workout.date).toLocaleDateString()}
            </h2>

            <p className="text-gray-400 mb-4">{workout.notes}</p>

            {/* Sets */}
            <div className="space-y-2">
              {workout.sets.map((set) => (
                <div key={set.id} className="ml-4">
                  <p>
                    {set.exercise.name} — {set.weight}kg x {set.reps}
                  </p>
                </div>
              ))}
            </div>
                       
            {/* ✅ DELETE BUTTON HERE */}
            <form action={`/api/workouts/${workout.id}`} method="POST">
              <button
                type="submit"
                className="mt-3 text-red-500 hover:text-red-400"
              >
                Delete Workout
              </button>
            </form>

          </div>
        ))}
      </div>
    </main>
  );
}