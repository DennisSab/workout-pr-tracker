export type ExerciseOption = {
  id: string;
  name: string;
  muscleGroup?: string;
};

export type WorkoutFormSet = {
  weight: string;
  reps: string;
};

export type WorkoutFormExercise = {
  exerciseId: string;
  sets: WorkoutFormSet[];
};

export type WorkoutFormValues = {
  date: string;
  notes: string;
  exercises: WorkoutFormExercise[];
};

export type WorkoutSetInput = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
};
