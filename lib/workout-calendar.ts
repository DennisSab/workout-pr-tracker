export function getWorkoutCalendarRange(now = new Date()) {
  return {
    start: new Date(2026, 5, 1),
    endExclusive: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  };
}

// Match the server-local calendar dates used by workout creation and history.
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildWorkoutCalendar(dates: Date[], now = new Date()) {
  const { start, endExclusive } = getWorkoutCalendarRange(now);
  const workoutDays = new Set(
    dates
      .filter((date) => date >= start && date < endExclusive)
      .map(dayKey)
  );
  const weeks: Array<Array<{ key: string; date: Date; active: boolean }>> = [];
  const months: Array<{ key: string; label: string; year: number; column: number }> = [];
  const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
  let run = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  // June 1, 2026 is a Monday. Calendar arithmetic avoids DST-length days.
  for (const date = new Date(start); date < endExclusive; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === 1) weeks.push([]);
    const key = dayKey(date);
    const active = workoutDays.has(key);
    weeks[weeks.length - 1].push({ key, date: new Date(date), active });
    if (date.getDate() === 1) {
      months.push({ key, label: monthFormatter.format(date), year: date.getFullYear(), column: weeks.length });
    }
    run = active ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
    if (key === dayKey(yesterday) || key === dayKey(now)) {
      // Yesterday's run remains current until today is over.
      if (active || key === dayKey(yesterday)) currentStreak = run;
    }
  }

  return { weeks, months, gymDays: workoutDays.size, currentStreak, longestStreak };
}
