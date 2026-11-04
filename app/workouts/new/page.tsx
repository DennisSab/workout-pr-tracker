import Navbar from "@/components/ui/Navbar";
import WorkoutForm from "@/components/ui/workouts/WorkoutForm";
import prisma from "@/lib/prisma";
import { requirePageUserId } from "@/lib/auth-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getExercises() {
  return prisma.exercise.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export default async function NewWorkoutPage() {
  await requirePageUserId();
  const exercises = await getExercises();

  return (
    <>
      <Navbar />
      <WorkoutForm
        mode="create"
        exercises={exercises}
        initialValues={{
          date: "",
          notes: "",
          exercises: [{ exerciseId: "", sets: [{ weight: "", reps: "" }] }],
        }}
        title="Create Workout"
        description="Log a workout with multiple exercises and sets."
        submitLabel="Save Workout"
      />
    </>
  );
}
