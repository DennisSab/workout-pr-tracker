export const workoutDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatWeight(weight: number) {
  return `${Number.isInteger(weight) ? weight : weight.toFixed(1)}kg`;
}

export function formatVolume(volume: number) {
  return `${volume.toLocaleString()} kg`;
}
