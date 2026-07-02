"use client";

import Navbar from "@/components/ui/Navbar";
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  type ExerciseBlock = {
  exerciseId: string;
  sets: SetType[];
};

  const [exercisesData, setExercisesData] = useState<ExerciseBlock[]>([
    {
      exerciseId: "",
      sets: [{ weight: "", reps: "" }],
    },
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

  function addExercise() {
    setExercisesData([
      ...exercisesData,
      {
        exerciseId: "",
        sets: [{ weight: "", reps: "" }],
      },
    ]);
  }

  function addSet(exIndex: number) {
    const updated = [...exercisesData];
    updated[exIndex].sets.push({ weight: "", reps: "" });
    setExercisesData(updated);
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
        exercises: exercisesData.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets.map((s, index) => ({
            weight: Number(s.weight),
            reps: Number(s.reps),
            setNumber: index + 1,
          })),
        })),
      }),
    });

    if (res.ok) {
      window.location.href = "/workouts";
    }
  }

  return (
    <>
    <Navbar />
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

          
          {exercisesData.map((exerciseBlock, exIndex) => (
            <div key={exIndex} className="bg-gray-800 p-4 rounded space-y-3">

              {/* ✅ Exercise Select */}
              <select
                value={exerciseBlock.exerciseId}
                onChange={(e) => {
                  const updated = [...exercisesData];
                  updated[exIndex].exerciseId = e.target.value;
                  setExercisesData(updated);
                }}
                className="w-full px-3 py-2 rounded bg-gray-700"
              >
                <option value="">Select Exercise</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              
              {/* ✅ REMOVE EXERCISE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  const updated = [...exercisesData];
                  updated.splice(exIndex, 1);
                  setExercisesData(updated);
                }}
                className="text-red-400 text-sm"
              >
                Remove Exercise
              </button>


              {/* ✅ Sets */}
              {exerciseBlock.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex gap-2 items-center">
                  
                  <input
                    placeholder="Weight"
                    value={set.weight}
                    onChange={(e) => {
                      const updated = [...exercisesData];
                      updated[exIndex].sets[setIndex].weight = e.target.value;
                      setExercisesData(updated);
                    }}
                    className="w-1/2 px-2 py-1 bg-gray-700 rounded"
                  />

                  <input
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => {
                      const updated = [...exercisesData];
                      updated[exIndex].sets[setIndex].reps = e.target.value;
                      setExercisesData(updated);
                    }}
                    className="w-1/2 px-2 py-1 bg-gray-700 rounded"
                  />

                  {/* ✅ REMOVE SET BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...exercisesData];
                      updated[exIndex].sets.splice(setIndex, 1);
                      setExercisesData(updated);
                    }}
                    className="text-red-400 text-sm"
                  >
                    ✕
                  </button>

                </div>
              ))}

              {/* ✅ Add Set */}
              <button
                type="button"
                onClick={() => addSet(exIndex)}
                className="w-full py-2 bg-blue-600 rounded-lg text-white text-lg"
              >
                + Add Set
              </button>
            </div>
          ))}

          {/* ✅ Add Exercise */}
          <button
            type="button"
            onClick={addExercise}
            className="w-full py-2 bg-green-600 rounded-lg text-white text-lg"
          >
            + Add Exercise
          </button>   

          {/* ✅ Submit */}
          <button className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-lg text-lg font-semibold">
            Save Workout
          </button>
        </form>
      </main>
    </>
  );
}