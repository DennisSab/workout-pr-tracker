import Navbar from "@/components/ui/Navbar";
import WorkoutForm from "@/components/ui/workouts/WorkoutForm";
import prisma from "@/lib/prisma";

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
  const exercises = await getExercises();

  return (
    <>
      <Navbar />
      <WorkoutForm
        mode="create"
        exercises={exercises}
        initialValues={{
          date: new Date().toISOString().split("T")[0],
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
