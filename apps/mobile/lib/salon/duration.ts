/** One display format for catalog, booking, appointment and owner durations. */
export function formatDuration(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Duration unavailable";
  const minutes = Math.round(value);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [
    hours ? hours + (hours === 1 ? " hour" : " hours") : "",
    remainder || !hours ? remainder + (remainder === 1 ? " minute" : " minutes") : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function serviceDurationLabel(service: {
  duration: number;
  duration_label?: string | null;
}) {
  return service.duration_label?.trim() || formatDuration(service.duration);
}
