"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteWorkoutButtonProps = {
  workoutId: string;
};

export default function DeleteWorkoutButton({
  workoutId,
}: DeleteWorkoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this workout? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          setError("Unable to delete workout.");
          return;
        }

        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
