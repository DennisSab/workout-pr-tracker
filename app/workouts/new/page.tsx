"use client";

import { useState, useEffect } from "react";

type Exercise = {
  id: string;
  name: string;
};

type SetType = {
  weight: string;
  reps: string;
};

export default function NewWorkoutPage() {
  const [notes, setNotes] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetType[]>([
    { weight: "", reps: "" },
  ]);

  // ✅ Fetch exercises
  useEffect(() => {
    async function fetchExercises() {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setExercises(data);
    }

    fetchExercises();
  }, []);

  // ✅ Add new set
  function addSet() {
    setSets([...sets, { weight: "", reps: "" }]);
  }

  // ✅ Submit workout
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes,
        exerciseId,
        sets: sets.map((s, index) => ({
          weight: Number(s.weight),
          reps: Number(s.reps),
          setNumber: index + 1,
        })),
      }),
    });

    if (res.ok) {
      window.location.href = "/workouts";
    }
  }

  return (
    <main className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Create Workout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ✅ Notes */}
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Workout notes"
          className="w-full px-3 py-2 rounded bg-gray-700"
        />

        {/* ✅ Exercise Select */}
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-700"
        >
          <option value="">Select Exercise</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>

        {/* ✅ Sets UI */}
        <div className="space-y-2">
          {sets.map((set, index) => (
            <div key={index} className="flex gap-2">
              <input
                placeholder="Weight"
                value={set.weight}
                onChange={(e) => {
                  const newSets = [...sets];
                  newSets[index].weight = e.target.value;
                  setSets(newSets);
                }}
                className="w-1/2 px-2 py-1 bg-gray-700 rounded"
              />

              <input
                placeholder="Reps"
                value={set.reps}
                onChange={(e) => {
                  const newSets = [...sets];
                  newSets[index].reps = e.target.value;
                  setSets(newSets);
                }}
                className="w-1/2 px-2 py-1 bg-gray-700 rounded"
              />
            </div>
          ))}
        </div>

        {/* ✅ Add Set Button */}
        <button
          type="button"
          onClick={addSet}
          className="text-sm text-blue-400"
        >
          + Add Set
        </button>

        {/* ✅ Submit */}
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
          Save Workout
        </button>
      </form>
    </main>
  );
}