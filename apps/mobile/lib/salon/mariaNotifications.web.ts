import type { Appointment } from "./types";

export async function clearMariaDemoReminders() {}

export async function scheduleMariaDemoReminders(_rows: Appointment[], _minutes: number) {
  throw new Error("Local Maria reminders are available in an iOS or Android build.");
}
