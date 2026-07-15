type MetricCardProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

export default function MetricCard({
  label,
  value,
  highlight = false,
}: MetricCardProps) {
  return (
    <div className="rounded-xl bg-gray-700 p-4">
      <p className="text-sm text-gray-400">{label}</p>

      <p
        className={`mt-1 text-xl font-bold ${
          highlight ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}