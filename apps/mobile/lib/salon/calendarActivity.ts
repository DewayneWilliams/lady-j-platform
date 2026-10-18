import { Appointment } from "./types";
export const blockReasons = [
  { value: "personal", label: "Personal Time", color: "blocked" },
  { value: "day_off", label: "Day Off / Holiday", color: "blocked" },
  { value: "closure", label: "Salon Closure", color: "blocked" },
  { value: "vip", label: "VIP Appointment", color: "vip" },
  { value: "consultation", label: "Consultation / Meeting", color: "consultation" },
  { value: "event", label: "Workshop / Event", color: "event" },
  { value: "other", label: "Other (Specify)", color: "blocked" },
] as const;
export type ActivityColor = "confirmed" | "blocked" | "vip" | "consultation" | "event";
export const activityLegend: { key: ActivityColor; label: string; short: string }[] = [
  { key: "confirmed", label: "Confirmed Appointments", short: "Confirmed" },
  { key: "blocked", label: "Blocked / Unavailable", short: "Blocked" },
  { key: "vip", label: "VIP Appointments", short: "VIP" },
  { key: "consultation", label: "Consultations / Meetings", short: "Meetings" },
  { key: "event", label: "Workshops & Events", short: "Events" },
];
export function activityColor(a: Appointment): ActivityColor | null {
  if (a.status === "cancelled") return null;
  if (a.kind === "block")
    return blockReasons.find((r) => r.value === a.block_reason)?.color || "blocked";
  return a.status === "confirmed" || a.status === "completed" ? "confirmed" : null;
}
export function blockReasonLabel(reason?: string) {
  return blockReasons.find((r) => r.value === reason)?.label || "Blocked / Unavailable";
}
export function addCalendarDays(day: string, count: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function localCalendarTime(iso: string) {
  return new Date(Date.parse(iso) - 4 * 3600000).toISOString().slice(0, 16);
}
export function activitiesOnDate(activities: Appointment[], day: string) {
  const begin = Date.parse(day + "T00:00:00-04:00");
  const end = Date.parse(addCalendarDays(day, 1) + "T00:00:00-04:00");
  return activities
    .filter(
      (a) =>
        a.status !== "cancelled" && Date.parse(a.starts_at) < end && Date.parse(a.ends_at) > begin,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id));
}
export function dotsOnDate(activities: Appointment[], day: string): ActivityColor[] {
  const present = new Set(activitiesOnDate(activities, day).map(activityColor));
  return activityLegend.map((item) => item.key).filter((key) => present.has(key));
}
