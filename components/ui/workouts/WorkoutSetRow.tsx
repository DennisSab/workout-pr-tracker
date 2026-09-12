"use client";

import type { WorkoutFormSet } from "@/lib/workout-types";

type WorkoutSetRowProps = {
  set: WorkoutFormSet;
  setIndex: number;
  onChange: (
    setIndex: number,
    field: keyof WorkoutFormSet,
    value: string | null
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-14 text-sm text-gray-400">Set {setIndex + 1}</div>

      <select
        aria-label={`Set ${setIndex + 1} load type`}
        value={set.weight === null ? "bodyweight" : "weighted"}
        onChange={(event) => onChange(setIndex, "weight", event.target.value === "bodyweight" ? null : "")}
        className="rounded-lg bg-gray-700 px-2 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="weighted">Weighted</option>
        <option value="bodyweight">Bodyweight</option>
      </select>

      {set.weight !== null && (
      <input
        aria-label={`Set ${setIndex + 1} weight in kg`}
        inputMode="decimal"
        placeholder="Weight"
        value={set.weight}
        onChange={(event) =>
          onChange(setIndex, "weight", event.target.value)
        }
        className="min-w-0 w-20 flex-1 rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
      />
      )}

      <input
        aria-label={`Set ${setIndex + 1} reps`}
        inputMode="numeric"
        placeholder="Reps"
        value={set.reps}
        onChange={(event) =>
          onChange(setIndex, "reps", event.target.value)
        }
        className="min-w-0 w-20 flex-1 rounded-lg bg-gray-700 px-3 py-2 text-white outline-none ring-1 ring-transparent transition focus:ring-blue-500"
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
