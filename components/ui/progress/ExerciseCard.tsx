import MetricCard from "./MetricCard";
import PerformanceCard from "./PerformanceCard";
import Link from "next/link";

type Performance = {
  weight: number | null;
  reps: number;
  date: Date;
};

type ExerciseCardProps = {
  exerciseId: string;
  exerciseName: string;
  personalRecord: number | null;
  totalVolume: number | null;
  totalSets: number;
  totalSessions: number;
  lastTrained: Date;
  lastWorkout: Performance | null;
  previousWorkout: Performance | null;
};

export default function ExerciseCard({
  exerciseId,
  exerciseName,
  personalRecord,
  totalVolume,
  totalSets,
  totalSessions,
  lastTrained,
  lastWorkout,
  previousWorkout,
}: ExerciseCardProps) {
  const performanceDifference =
    lastWorkout && previousWorkout && lastWorkout.weight !== null && previousWorkout.weight !== null
      ? lastWorkout.weight - previousWorkout.weight
      : null;

  return (
    <Link
      href={`/exercises/${exerciseId}`}
      className="block rounded-2xl border border-gray-700 bg-gray-800 p-5 transition hover:border-gray-500 hover:bg-gray-750"
    >
      <h2 className="mb-5 text-xl font-semibold">{exerciseName}</h2>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Personal Record"
          value={personalRecord === null ? "—" : `${personalRecord} kg`}
          highlight
        />

        <MetricCard
          label="Total Volume"
          value={totalVolume === null ? "—" : `${totalVolume.toLocaleString()} kg`}
        />

        <MetricCard label="Total Sets" value={totalSets} />

        <MetricCard label="Sessions" value={totalSessions} />
      </div>

      <div className="mt-3 rounded-xl bg-gray-700 p-4">
        <p className="text-sm text-gray-400">Last Trained</p>

        <p className="mt-1 font-semibold">
          {lastTrained.toLocaleDateString()}
        </p>
      </div>

      {lastWorkout && (
        <div className="mt-3">
          <PerformanceCard
            label="Latest Performance"
            weight={lastWorkout.weight}
            reps={lastWorkout.reps}
          />
        </div>
      )}

      {previousWorkout &&
        lastWorkout && (
          <div className="mt-3">
            <PerformanceCard
              label="Previous Performance"
              weight={previousWorkout.weight}
              reps={previousWorkout.reps}
              difference={performanceDifference}
            />
          </div>
        )}
    </Link>
  );
}
