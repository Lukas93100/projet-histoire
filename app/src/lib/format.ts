export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
