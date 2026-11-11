import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-5 text-white">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <p className="text-sm font-medium text-blue-400">WorkoutPR V2</p>
        <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>
        <p className="mt-3 text-gray-400">
          Sign in to access your workouts, progress, and personal records.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-gray-950 transition hover:bg-gray-200"
          >
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}
