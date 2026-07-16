"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import WorkoutExerciseBlock from "@/components/ui/workouts/WorkoutExerciseBlock";
import type {
  ExerciseOption,
  WorkoutFormSet,
  WorkoutFormValues,
} from "@/lib/workout-types";

type WorkoutFormProps = {
  mode: "create" | "edit";
  exercises: ExerciseOption[];
  initialValues: WorkoutFormValues;
  submitLabel: string;
  title: string;
  description: string;
  workoutId?: string;
};

const emptySet = { weight: "", reps: "" };
const emptyExercise = { exerciseId: "", sets: [emptySet] };

export default function WorkoutForm({
  mode,
  exercises,
  initialValues,
  submitLabel,
  title,
  description,
  workoutId,
}: WorkoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<WorkoutFormValues>(initialValues);

  function updateExercise(
    exerciseIndex: number,
    updater: (
      current: WorkoutFormValues["exercises"][number]
    ) => WorkoutFormValues["exercises"][number]
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      exercises: currentValues.exercises.map((exercise, index) =>
        index === exerciseIndex ? updater(exercise) : exercise
      ),
    }));
  }

  function addExercise() {
    setValues((currentValues) => ({
      ...currentValues,
      exercises: [...currentValues.exercises, { ...emptyExercise, sets: [{ ...emptySet }] }],
    }));
  }

  function removeExercise(exerciseIndex: number) {
    setValues((currentValues) => {
      const nextExercises = currentValues.exercises.filter(
        (_, index) => index !== exerciseIndex
      );

      return {
        ...currentValues,
        exercises:
          nextExercises.length > 0
            ? nextExercises
            : [{ ...emptyExercise, sets: [{ ...emptySet }] }],
      };
    });
  }

  function addSet(exerciseIndex: number) {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: [...exercise.sets, { ...emptySet }],
    }));
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    updateExercise(exerciseIndex, (exercise) => {
      const nextSets = exercise.sets.filter((_, index) => index !== setIndex);

      return {
        ...exercise,
        sets: nextSets.length > 0 ? nextSets : [{ ...emptySet }],
      };
    });
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutFormSet,
    value: string
  ) {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...set, [field]: value } : set
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const endpoint =
      mode === "create" ? "/api/workouts" : `/api/workouts/${workoutId}`;
    const method = mode === "create" ? "POST" : "PUT";

    startTransition(() => {
      void (async () => {
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          setError(body?.error ?? "Unable to save workout.");
          return;
        }

        router.push("/workouts");
        router.refresh();
      })();
    });
  }

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-gray-400">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl bg-gray-800 p-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Workout Date
                </label>

                <input
                  type="date"
                  value={values.date}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Notes
                </label>

                <textarea
                  value={values.notes}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Workout notes"
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <div className="space-y-4">
            {values.exercises.map((exercise, exerciseIndex) => (
              <WorkoutExerciseBlock
                key={exerciseIndex}
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                exerciseOptions={exercises}
                onExerciseChange={(index, exerciseId) =>
                  updateExercise(index, (currentExercise) => ({
                    ...currentExercise,
                    exerciseId,
                  }))
                }
                onSetChange={updateSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                canRemoveExercise={values.exercises.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addExercise}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Add Exercise
          </button>

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {isPending ? "Saving..." : submitLabel}
          </button>
        </form>
      </div>
    </main>
  );
}
