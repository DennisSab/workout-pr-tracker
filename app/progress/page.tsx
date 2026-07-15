import Navbar from "@/components/ui/Navbar";
import prisma from "@/lib/prisma";
import ExerciseCard from "@/components/ui/progress/ExerciseCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Performance = {
  weight: number;
  reps: number;
  date: Date;
};

type ExerciseStats = {
  exerciseId: string;
  exerciseName: string;
  personalRecord: number;
  totalSets: number;
  totalSessions: number;
  totalVolume: number;
  lastTrained: Date;
  lastWorkout: Performance | null;
  previousWorkout: Performance | null;
};

async function getWorkouts() {
  return prisma.workout.findMany({
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

function buildExerciseStats(
  workouts: Awaited<ReturnType<typeof getWorkouts>>
): ExerciseStats[] {
  const statsMap = new Map<string, ExerciseStats>();

  workouts.forEach((workout) => {
    const exercisesInSession = new Set<string>();

    workout.sets.forEach((set) => {
      const exerciseId = set.exercise.id;
      const currentStats = statsMap.get(exerciseId);

      if (!currentStats) {
        statsMap.set(exerciseId, {
          exerciseId,
          exerciseName: set.exercise.name,
          personalRecord: set.weight,
          totalSets: 1,
          totalSessions: 0,
          totalVolume: set.weight * set.reps,
          lastTrained: workout.date,
          lastWorkout: {
            weight: set.weight,
            reps: set.reps,
            date: workout.date,
          },
          previousWorkout: null,
        });
      } else {
        currentStats.personalRecord = Math.max(
          currentStats.personalRecord,
          set.weight
        );

        currentStats.totalSets += 1;
        currentStats.totalVolume += set.weight * set.reps;

        if (workout.date > currentStats.lastTrained) {
          currentStats.lastTrained = workout.date;
        }

        const candidatePerformance: Performance = {
          weight: set.weight,
          reps: set.reps,
          date: workout.date,
        };

        const workoutTime = workout.date.getTime();
        const latestTime = currentStats.lastWorkout?.date.getTime();

        if (!currentStats.lastWorkout || latestTime === undefined) {
          currentStats.lastWorkout = candidatePerformance;
        } else if (workoutTime > latestTime) {
          currentStats.previousWorkout = currentStats.lastWorkout;
          currentStats.lastWorkout = candidatePerformance;
        } else if (workoutTime === latestTime) {
          if (set.weight > currentStats.lastWorkout.weight) {
            currentStats.lastWorkout = candidatePerformance;
          }
        } else {
          const previousTime =
            currentStats.previousWorkout?.date.getTime();

          if (
            !currentStats.previousWorkout ||
            previousTime === undefined ||
            workoutTime > previousTime
          ) {
            currentStats.previousWorkout = candidatePerformance;
          } else if (
            workoutTime === previousTime &&
            set.weight > currentStats.previousWorkout.weight
          ) {
            currentStats.previousWorkout = candidatePerformance;
          }
        }
      }

      exercisesInSession.add(exerciseId);
    });

    exercisesInSession.forEach((exerciseId) => {
      const exerciseStats = statsMap.get(exerciseId);

      if (exerciseStats) {
        exerciseStats.totalSessions += 1;
      }
    });
  });

  return Array.from(statsMap.values()).sort(
    (a, b) => b.lastTrained.getTime() - a.lastTrained.getTime()
  );
}

export default async function ProgressPage() {
  const workouts = await getWorkouts();
  const exerciseStats = buildExerciseStats(workouts);

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