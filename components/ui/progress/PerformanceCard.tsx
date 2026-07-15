type PerformanceCardProps = {
  label: string;
  weight: number;
  reps: number;
  difference?: number | null;
};

export default function PerformanceCard({
  label,
  weight,
  reps,
  difference = null,
}: PerformanceCardProps) {
  return (
    <div className="rounded-xl bg-gray-700 p-4">
      <p className="text-sm text-gray-400">{label}</p>

      <p className="mt-1 font-semibold">
        {weight} kg × {reps} reps
      </p>

      {difference !== null && (
        <p
          className={`mt-2 text-sm font-semibold ${
            difference > 0
              ? "text-green-400"
              : difference < 0
                ? "text-red-400"
                : "text-gray-300"
          }`}
        >
          {difference > 0 ? "+" : ""}
          {difference} kg from previous session
        </p>
      )}
    </div>
  );
}