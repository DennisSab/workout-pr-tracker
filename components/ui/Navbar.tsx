import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-gray-950 border-b border-gray-800 px-6 py-4">
      <Link href="/" className="text-xl font-bold text-white">
        Workout PR Tracker 💪
      </Link>
    </header>
  );
}