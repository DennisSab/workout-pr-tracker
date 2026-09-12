import { buildWorkoutCalendar } from "@/lib/workout-calendar";
import { workoutDateFormatter } from "@/lib/formatters";

type WorkoutCalendarProps = {
  dates: Date[];
  today: Date;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutCalendar({ dates, today }: WorkoutCalendarProps) {
  const { weeks, months, gymDays, currentStreak, longestStreak } = buildWorkoutCalendar(dates, today);

  return (
    <section aria-labelledby="workout-calendar-title" className="min-w-0 rounded-2xl bg-gray-900 p-5 shadow-lg">
      <h2 id="workout-calendar-title" className="text-xl font-semibold">Workout Consistency</h2>
      <p className="mt-2 text-sm text-gray-300">
        <span className="font-semibold text-white">{gymDays}</span> gym sessions since June 2026
      </p>
      <p className="mt-1 text-xs text-gray-400">Each workout day counts once.</p>

      <div className="mt-5 flex gap-2">
        <div aria-hidden="true" className="grid shrink-0 grid-rows-7 gap-1 pt-12 text-[10px] leading-3">
          {weekdays.map((day) => <span key={day} className="h-3 text-gray-400">{day}</span>)}
        </div>
        <div tabIndex={0} role="region" aria-label="Workout calendar, scroll horizontally to see all dates" className="min-w-0 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-blue-500">
          <div className="grid w-max gap-x-1 pr-6" style={{ gridTemplateColumns: `repeat(${weeks.length}, 0.75rem)` }}>
            {months.map((month, index) => (
              <div key={month.key} className="relative h-12 text-[10px] text-gray-400" style={{ gridColumn: month.column, gridRow: 1 }}>
                {index === 0 || month.year !== months[index - 1].year ? <span className="absolute top-0 text-gray-300">{month.year}</span> : null}
                <span className="absolute top-5">{month.label}</span>
              </div>
            ))}
            {weeks.map((week, index) => (
              <div key={week[0].key} className="grid grid-rows-7 gap-1" style={{ gridColumn: index + 1, gridRow: 2 }}>
                {week.map((day) => {
                  const label = `${workoutDateFormatter.format(day.date)}: ${day.active ? "Workout logged" : "No workout"}`;
                  return <span key={day.key} role="img" aria-label={label} title={label} className={`block size-3 rounded-[3px] ${day.active ? "bg-blue-600" : "bg-gray-800"}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-[3px] bg-gray-800" />No workout</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-[3px] bg-blue-600" />Workout logged</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-800 pt-4 text-xs text-gray-400">
        <p>Current streak <span className="font-semibold text-white">{currentStreak} {currentStreak === 1 ? "day" : "days"}</span></p>
        <p>Longest since June 2026 <span className="font-semibold text-white">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span></p>
      </div>
    </section>
  );
}
