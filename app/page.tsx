import Image from "next/image";
import { Button } from "@/components/ui/Button"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="text-4xl font-bold">
        Workout PR Tracker 💪
      </h1>

      <Button>Get Started</Button>
    </main>
  );
}
``
