import Navbar from "@/components/ui/Navbar";
import WorkoutForm from "@/components/ui/workouts/WorkoutForm";
import prisma from "@/lib/prisma";
import { buildWorkoutFormValues } from "@/lib/workout-validation";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EditWorkoutPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWorkoutPage({
  params,
}: EditWorkoutPageProps) {
  const { id } = await params;

  const [exercises, workout] = await Promise.all([
    prisma.exercise.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.workout.findUnique({
      where: {
        id,
      },
      include: {
        sets: {
          orderBy: [
            {
              exerciseId: "asc",
            },
            {
              setNumber: "asc",
            },
          ],
        },
      },
    }),
  ]);

  if (!workout) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <WorkoutForm
        mode="edit"
        workoutId={workout.id}
        exercises={exercises}
        initialValues={buildWorkoutFormValues({
          date: workout.date,
          notes: workout.notes,
          sets: workout.sets,
        })}
        title="Edit Workout"
        description="Update the date, notes, exercises, and sets for this session."
        submitLabel="Update Workout"
      />
    </>
  );
}
