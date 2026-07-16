import type { GroupedWorkoutHistory } from "@/lib/exercise-details";

type WorkoutHistoryListProps = {
  workouts: GroupedWorkoutHistory[];
};

const workoutDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function WorkoutHistoryList({
  workouts,
}: WorkoutHistoryListProps) {
  if (workouts.length === 0) {
    return (
      <p className="mt-4 text-gray-400">
        No workout history for this exercise.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {workouts.map((workout) => (
        <div
          key={workout.workoutId}
          className="rounded-xl bg-gray-700 p-4"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Workout
          </p>

          <p className="mt-1 text-lg font-semibold text-white">
            {workoutDateFormatter.format(workout.date)}
          </p>

          {workout.notes ? (
            <p className="mt-2 text-sm text-gray-300">{workout.notes}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {workout.sets.map((set) => (
              <div
                key={set.id}
                className="border-t border-gray-600 pt-3 first:border-t-0 first:pt-0"
              >
                <p className="text-sm text-gray-400">Set {set.setNumber}</p>

                <p className="mt-1 font-semibold text-white">
                  {set.weight}kg × {set.reps}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
