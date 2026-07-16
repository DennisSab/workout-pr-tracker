export type ExerciseSetWithWorkout = {
  id: string;
  workoutId: string;
  setNumber: number;
  reps: number;
  weight: number;
  workout: {
    id: string;
    date: Date;
    notes: string | null;
  };
};

export type ExerciseStats = {
  personalRecord: number;
  totalSessions: number;
  totalSets: number;
  totalVolume: number;
};

export type GroupedWorkoutHistory = {
  workoutId: string;
  date: Date;
  notes: string | null;
  sets: Array<{
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
  }>;
};

export function buildExerciseStats(
  sets: ExerciseSetWithWorkout[]
): ExerciseStats {
  return sets.reduce<ExerciseStats>(
    (stats, set) => {
      stats.personalRecord = Math.max(stats.personalRecord, set.weight);
      stats.totalSets += 1;
      stats.totalVolume += set.weight * set.reps;
      return stats;
    },
    {
      personalRecord: 0,
      totalSessions: new Set(sets.map((set) => set.workoutId)).size,
      totalSets: 0,
      totalVolume: 0,
    }
  );
}

export function groupWorkoutHistory(
  sets: ExerciseSetWithWorkout[]
): GroupedWorkoutHistory[] {
  const workoutMap = new Map<string, GroupedWorkoutHistory>();

  sets.forEach((set) => {
    const existingWorkout = workoutMap.get(set.workoutId);

    if (!existingWorkout) {
      workoutMap.set(set.workoutId, {
        workoutId: set.workoutId,
        date: set.workout.date,
        notes: set.workout.notes,
        sets: [
          {
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
          },
        ],
      });

      return;
    }

    existingWorkout.sets.push({
      id: set.id,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
    });
  });

  return Array.from(workoutMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}
