import { formatWeight } from "@/lib/formatters";

type WorkoutWithSets = {
  id: string;
  date: Date;
  notes: string | null;
  sets: Array<{
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    exercise: {
      id: string;
      name: string;
      muscleGroup: string;
    };
  }>;
};

export type WorkoutExerciseGroup = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  personalRecord: number;
  sets: Array<{
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    isPersonalRecord: boolean;
    performanceLabel: string;
  }>;
};

export type WorkoutHistoryEntry = {
  id: string;
  date: Date;
  notes: string | null;
  exercises: WorkoutExerciseGroup[];
};

export function buildGlobalPersonalRecords(workouts: WorkoutWithSets[]) {
  const personalRecords = new Map<string, number>();

  workouts.forEach((workout) => {
    workout.sets.forEach((set) => {
      const currentRecord = personalRecords.get(set.exercise.id) ?? 0;
      personalRecords.set(
        set.exercise.id,
        Math.max(currentRecord, set.weight)
      );
    });
  });

  return personalRecords;
}

export function buildWorkoutHistory(
  workouts: WorkoutWithSets[]
): WorkoutHistoryEntry[] {
  const personalRecords = buildGlobalPersonalRecords(workouts);

  return workouts.map((workout) => {
    const exerciseMap = new Map<string, WorkoutExerciseGroup>();

    workout.sets.forEach((set) => {
      const personalRecord = personalRecords.get(set.exercise.id) ?? set.weight;
      const existingExercise = exerciseMap.get(set.exercise.id);

      const normalizedSet = {
        id: set.id,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
        isPersonalRecord: set.weight === personalRecord,
        performanceLabel: `${formatWeight(set.weight)} x ${set.reps}`,
      };

      if (!existingExercise) {
        exerciseMap.set(set.exercise.id, {
          exerciseId: set.exercise.id,
          exerciseName: set.exercise.name,
          muscleGroup: set.exercise.muscleGroup,
          personalRecord,
          sets: [normalizedSet],
        });
        return;
      }

      existingExercise.sets.push(normalizedSet);
    });

    return {
      id: workout.id,
      date: workout.date,
      notes: workout.notes,
      exercises: Array.from(exerciseMap.values()),
    };
  });
}
