import Link from "next/link";
import DeleteWorkoutButton from "@/components/ui/workouts/DeleteWorkoutButton";
import { formatWeight, workoutDateFormatter } from "@/lib/formatters";
import type { WorkoutHistoryEntry } from "@/lib/workout-history";

type WorkoutHistoryCardProps = {
  workout: WorkoutHistoryEntry;
};

export default function WorkoutHistoryCard({
  workout,
}: WorkoutHistoryCardProps) {
  return (
    <article className="rounded-2xl bg-gray-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {workoutDateFormatter.format(workout.date)}
          </h2>
          <p className="mt-2 text-gray-400">
            {workout.notes?.trim() ? workout.notes : "No notes"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/workouts/${workout.id}/edit`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10"
          >
            Edit
          </Link>

          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {workout.exercises.map((exercise) => (
          <section key={exercise.exerciseId}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{exercise.exerciseName}</h3>
              <span className="text-sm text-gray-400">
                {exercise.muscleGroup}
              </span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-300">
                PR: {formatWeight(exercise.personalRecord)}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {exercise.sets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center justify-between rounded-xl bg-gray-700 px-4 py-3"
                >
                  <p className="text-sm text-gray-300">Set {set.setNumber}</p>

                  <p
                    className={`font-semibold ${
                      set.isPersonalRecord ? "text-green-400" : "text-white"
                    }`}
                  >
                    {set.performanceLabel}
                    {set.isPersonalRecord ? " PR" : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
