type ProgressWorkout = {
  date: Date;
  sets: Array<{
    weight: number | null;
    reps: number;
    exercise: { id: string; name: string };
  }>;
};

type Performance = {
  weight: number | null;
  reps: number;
  date: Date;
};

type ExerciseStats = {
  exerciseId: string;
  exerciseName: string;
  personalRecord: number | null;
  totalSets: number;
  totalSessions: number;
  totalVolume: number | null;
  lastTrained: Date;
  lastWorkout: Performance | null;
  previousWorkout: Performance | null;
};

export function buildProgressStats(
  workouts: ProgressWorkout[]
): ExerciseStats[] {
  const statsMap = new Map<string, ExerciseStats>();

  workouts.forEach((workout) => {
    const exercisesInSession = new Set<string>();

    workout.sets.forEach((set) => {
      const exerciseId = set.exercise.id;
      const currentStats = statsMap.get(exerciseId);

      if (!currentStats) {
        statsMap.set(exerciseId, {
          exerciseId,
          exerciseName: set.exercise.name,
          personalRecord: set.weight,
          totalSets: 1,
          totalSessions: 0,
          totalVolume: set.weight === null ? null : set.weight * set.reps,
          lastTrained: workout.date,
          lastWorkout: {
            weight: set.weight,
            reps: set.reps,
            date: workout.date,
          },
          previousWorkout: null,
        });
      } else {
        if (set.weight !== null) {
          currentStats.personalRecord = Math.max(currentStats.personalRecord ?? 0, set.weight);
          currentStats.totalVolume = (currentStats.totalVolume ?? 0) + set.weight * set.reps;
        }

        currentStats.totalSets += 1;

        if (workout.date > currentStats.lastTrained) {
          currentStats.lastTrained = workout.date;
        }

        const candidatePerformance: Performance = {
          weight: set.weight,
          reps: set.reps,
          date: workout.date,
        };

        const workoutTime = workout.date.getTime();
        const latestTime = currentStats.lastWorkout?.date.getTime();

        if (!currentStats.lastWorkout || latestTime === undefined) {
          currentStats.lastWorkout = candidatePerformance;
        } else if (workoutTime > latestTime) {
          currentStats.previousWorkout = currentStats.lastWorkout;
          currentStats.lastWorkout = candidatePerformance;
        } else if (workoutTime === latestTime) {
          if (set.weight !== null && (currentStats.lastWorkout.weight === null || set.weight > currentStats.lastWorkout.weight)) {
            currentStats.lastWorkout = candidatePerformance;
          }
        } else {
          const previousTime =
            currentStats.previousWorkout?.date.getTime();

          if (
            !currentStats.previousWorkout ||
            previousTime === undefined ||
            workoutTime > previousTime
          ) {
            currentStats.previousWorkout = candidatePerformance;
          } else if (
            workoutTime === previousTime &&
            set.weight !== null &&
            (currentStats.previousWorkout.weight === null || set.weight > currentStats.previousWorkout.weight)
          ) {
            currentStats.previousWorkout = candidatePerformance;
          }
        }
      }

      exercisesInSession.add(exerciseId);
    });

    exercisesInSession.forEach((exerciseId) => {
      const exerciseStats = statsMap.get(exerciseId);

      if (exerciseStats) {
        exerciseStats.totalSessions += 1;
      }
    });
  });

  return Array.from(statsMap.values()).sort(
    (a, b) => b.lastTrained.getTime() - a.lastTrained.getTime()
  );
}
