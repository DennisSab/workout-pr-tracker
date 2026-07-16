"use client";

import type { WorkoutFormSet } from "@/lib/workout-types";

type WorkoutSetRowProps = {
  set: WorkoutFormSet;
  setIndex: number;
  onChange: (
    setIndex: number,
    field: keyof WorkoutFormSet,
    value: string
  ) => void;
  onRemove: (setIndex: number) => void;
  canRemove: boolean;
};

export default function WorkoutSetRow({
  set,
  setIndex,
  onChange,
  onRemove,
  canRemove,
}: WorkoutSetRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 text-sm text-gray-400">Set {setIndex + 1}</div>

      <input
        inputMode="decimal"
        placeholder="Weight"
        value={set.weight}
        onChange={(event) =>
          onChange(setIndex, "weight", event.target.value)
        }
        className="w-1/2 rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
      />

      <input
        inputMode="numeric"
        placeholder="Reps"
        value={set.reps}
        onChange={(event) =>
          onChange(setIndex, "reps", event.target.value)
        }
        className="w-1/2 rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
      />

      <button
        type="button"
        onClick={() => onRemove(setIndex)}
        disabled={!canRemove}
        className="rounded-lg px-2 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        Remove
      </button>
    </div>
  );
}
