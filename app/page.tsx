import Link from "next/link";
import { Button } from "@/components/ui/Button";
import Navbar from "@/components/ui/Navbar";

export default function Home() {
  return (
    <>
    <Navbar />
      <main className="min-h-screen bg-gray-950 text-white px-5 py-8">
        <section className="mx-auto flex max-w-md flex-col gap-8">
          <div className="mt-8">
            <p className="text-sm text-gray-400">Welcome back</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight">
              Workout PR Tracker 💪
            </h1>
            <p className="mt-3 text-gray-400">
              Track your workouts, sets, and personal records.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-900 p-5 shadow-lg">
            <h2 className="text-xl font-semibold">Quick Actions</h2>

            <div className="mt-5 flex flex-col gap-3">
              <Link href="/workouts/new" className="block">
                <Button>Start New Workout</Button>
              </Link>

              <Link href="/workouts" className="block">
                <Button>Workout History</Button>
              </Link>

              <Link href="/progress" className="block">
                <Button>View Progress</Button>
              </Link>

            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-900 p-4">
              <p className="text-sm text-gray-400">Focus</p>
              <p className="mt-1 text-xl font-semibold">Progressive Overload</p>
            </div>

            <div className="rounded-2xl bg-gray-900 p-4">
              <p className="text-sm text-gray-400">Goal</p>
              <p className="mt-1 text-xl font-semibold">New PRs</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}