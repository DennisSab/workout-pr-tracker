import type {
  WorkoutFormValues,
  WorkoutSetInput,
} from "@/lib/workout-types";

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  error: string;
  status: number;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type ParsedWorkoutPayload = {
  date: Date;
  notes: string | null;
  sets: WorkoutSetInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePositiveNumber(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

// Only an explicit JSON null means bodyweight. Blank/missing/zero is invalid.
export function parseSetValues(input: unknown): { reps: number; weight: number | null } | null {
  if (!isRecord(input)) return null;
  const reps = parsePositiveNumber(input.reps);
  const weight = input.weight === null ? null : parsePositiveNumber(input.weight);
  if (reps === null || !Number.isSafeInteger(reps) || (input.weight !== null && weight === null)) return null;
  return { reps, weight };
}

export function parseWorkoutPayload(
  payload: unknown
): ValidationResult<ParsedWorkoutPayload> {
  if (!isRecord(payload)) {
    return {
      success: false,
      error: "Invalid workout payload.",
      status: 400,
    };
  }

  const rawExercises = payload.exercises;

  if (!Array.isArray(rawExercises)) {
    return {
      success: false,
      error: "Workout exercises are required.",
      status: 400,
    };
  }

  const rawDate = payload.date;
  const parsedDate =
    typeof rawDate === "string" && rawDate
      ? new Date(`${rawDate}T12:00:00`)
      : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      success: false,
      error: "Workout date is invalid.",
      status: 400,
    };
  }

  const rawNotes = payload.notes;
  const notes =
    typeof rawNotes === "string" && rawNotes.trim().length > 0
      ? rawNotes.trim()
      : null;

  const sets: WorkoutSetInput[] = [];

  for (const [exerciseIndex, exercise] of rawExercises.entries()) {
    if (!isRecord(exercise)) {
      return {
        success: false,
        error: `Exercise ${exerciseIndex + 1} is malformed.`,
        status: 400,
      };
    }

    const exerciseId =
      typeof exercise.exerciseId === "string"
        ? exercise.exerciseId.trim()
        : "";

    if (!exerciseId || !Array.isArray(exercise.sets)) {
      return {
        success: false,
        error: `Exercise ${exerciseIndex + 1} requires an exercise ID and a sets array.`,
        status: 400,
      };
    }

    if (exercise.sets.length === 0) {
      return {
        success: false,
        error: `Exercise ${exerciseIndex + 1} requires at least one set.`,
        status: 400,
      };
    }

    let setNumber = 1;

    for (const [setIndex, set] of exercise.sets.entries()) {
      const values = parseSetValues(set);
      if (!values) {
        return {
          success: false,
          error: `Exercise ${exerciseIndex + 1}, set ${setIndex + 1} requires positive whole-number reps and either a positive weight or explicit null for bodyweight.`,
          status: 400,
        };
      }

      sets.push({
        exerciseId,
        setNumber,
        ...values,
      });

      setNumber += 1;
    }
  }

  if (sets.length === 0) {
    return {
      success: false,
      error: "At least one valid set is required.",
      status: 400,
    };
  }

  return {
    success: true,
    data: {
      date: parsedDate,
      notes,
      sets,
    },
  };
}

export function parseExercisePayload(
  payload: unknown
): ValidationResult<{ name: string; muscleGroup: string }> {
  if (!isRecord(payload)) {
    return {
      success: false,
      error: "Invalid exercise payload.",
      status: 400,
    };
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const muscleGroup =
    typeof payload.muscleGroup === "string"
      ? payload.muscleGroup.trim()
      : "";

  if (!name) {
    return {
      success: false,
      error: "Exercise name is required.",
      status: 400,
    };
  }

  if (!muscleGroup) {
    return {
      success: false,
      error: "Muscle group is required.",
      status: 400,
    };
  }

  return {
    success: true,
    data: {
      name,
      muscleGroup,
    },
  };
}

export function buildWorkoutFormValues(input: {
  date: Date;
  notes: string | null;
  sets: Array<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number | null;
  }>;
}): WorkoutFormValues {
  const exerciseMap = new Map<string, WorkoutFormValues["exercises"][number]>();

  input.sets.forEach((set) => {
    const existingExercise = exerciseMap.get(set.exerciseId);
    const normalizedSet = {
      weight: set.weight === null ? null : String(set.weight),
      reps: String(set.reps),
    };

    if (!existingExercise) {
      exerciseMap.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        sets: [normalizedSet],
      });
      return;
    }

    existingExercise.sets.push(normalizedSet);
  });

  return {
    date: input.date.toISOString().split("T")[0],
    notes: input.notes ?? "",
    exercises:
      exerciseMap.size > 0
        ? Array.from(exerciseMap.values())
        : [{ exerciseId: "", sets: [{ weight: "", reps: "" }] }],
  };
}
