import { Appointment } from "./types";
import { addCalendarDays } from "./calendarActivity";
/** Fictional blocked periods only; never inserted into Supabase. */
export function createOwnerCalendarDemo(day: string): Appointment[] {
  return [0, 3, 12, 14].map((offset) => {
    const date = addCalendarDays(day, offset);
    return {
      id: "demo-calendar-block-" + offset,
      customer_id: "",
      kind: "block",
      status: "confirmed",
      starts_at: date + "T17:30:00-04:00",
      ends_at: date + "T18:00:00-04:00",
      services: [],
      total: 0,
      deposit: 0,
      deposit_paid: false,
      note: "Private time",
      block_reason: "personal",
      block_description: "Private time",
      all_day: false,
      block_repeat: "none",
      updated_at: date + "T00:00:00-04:00",
    };
  });
}
