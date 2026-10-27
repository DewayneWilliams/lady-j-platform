import type { Appointment } from "./types";

// TypeScript fallback; Metro resolves the .native or .web implementation first.
export async function clearMariaDemoReminders() {}

export async function scheduleMariaDemoReminders(_rows: Appointment[], _minutes: number) {
  throw new Error("Local Maria reminders require a supported app build.");
}
