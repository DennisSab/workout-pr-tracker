import { auth, signOut } from "@/auth";
import NavigationLinks from "@/components/ui/NavigationLinks";
import Link from "next/link";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Workout PR Tracker
        </Link>

        <NavigationLinks />

        {session?.user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-48 truncate text-gray-300">
              {session.user.name ?? session.user.email ?? "Signed in"}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-gray-700 px-3 py-2 font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
