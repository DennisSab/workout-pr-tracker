import MetricCard from "@/components/ui/progress/MetricCard";
import type { ExerciseStats } from "@/lib/exercise-details";

type ExerciseStatsGridProps = {
  stats: ExerciseStats;
};

export default function ExerciseStatsGrid({
  stats,
}: ExerciseStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        label="Personal Record"
        value={`${stats.personalRecord} kg`}
        highlight
      />

      <MetricCard label="Sessions" value={stats.totalSessions} />

      <MetricCard label="Total Sets" value={stats.totalSets} />

      <MetricCard
        label="Total Volume"
        value={`${stats.totalVolume.toLocaleString()} kg`}
      />
    </div>
  );
}
