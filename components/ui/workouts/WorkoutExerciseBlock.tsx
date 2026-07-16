"use client";

import WorkoutSetRow from "@/components/ui/workouts/WorkoutSetRow";
import type {
  ExerciseOption,
  WorkoutFormExercise,
  WorkoutFormSet,
} from "@/lib/workout-types";

type WorkoutExerciseBlockProps = {
  exercise: WorkoutFormExercise;
  exerciseIndex: number;
  exerciseOptions: ExerciseOption[];
  onExerciseChange: (exerciseIndex: number, exerciseId: string) => void;
  onSetChange: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutFormSet,
    value: string
  ) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  canRemoveExercise: boolean;
};

export default function WorkoutExerciseBlock({
  exercise,
  exerciseIndex,
  exerciseOptions,
  onExerciseChange,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  canRemoveExercise,
}: WorkoutExerciseBlockProps) {
  return (
    <section className="rounded-2xl bg-gray-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <select
          value={exercise.exerciseId}
          onChange={(event) =>
            onExerciseChange(exerciseIndex, event.target.value)
          }
          className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
        >
          <option value="">Select Exercise</option>
          {exerciseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onRemoveExercise(exerciseIndex)}
          disabled={!canRemoveExercise}
          className="rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {exercise.sets.map((set, setIndex) => (
          <WorkoutSetRow
            key={setIndex}
            set={set}
            setIndex={setIndex}
            onChange={(currentSetIndex, field, value) =>
              onSetChange(exerciseIndex, currentSetIndex, field, value)
            }
            onRemove={(currentSetIndex) =>
              onRemoveSet(exerciseIndex, currentSetIndex)
            }
            canRemove={exercise.sets.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAddSet(exerciseIndex)}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
      >
        Add Set
      </button>
    </section>
  );
}
