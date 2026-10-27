import { Appointment } from "./types";
import { addCalendarDays } from "./calendarActivity";
/** Fictional blocked periods only; never inserted into Supabase. */
export function createOwnerCalendarDemo(day: string): Appointment[] {
  const operatingOffsets = Array.from({ length: 14 }, (_, offset) => offset).filter((offset) => {
    const weekday = new Date(addCalendarDays(day, offset) + "T12:00:00Z").getUTCDay();
    return weekday >= 2 && weekday <= 6;
  });
  return operatingOffsets
    .filter((_, index) => index % 3 === 0)
    .slice(0, 4)
    .map((offset) => {
      const date = addCalendarDays(day, offset);
      return {
        id: "demo-calendar-block-" + offset,
        customer_id: "",
        kind: "block",
        status: "confirmed",
        starts_at: date + "T13:15:00-04:00",
        ends_at: date + "T13:45:00-04:00",
        services: [],
        total: 0,
        deposit: 0,
        deposit_paid: false,
        note: "DEMO · Personal reason",
        block_reason: "personal",
        block_description: "DEMO · Personal reason",
        all_day: false,
        block_repeat: "none",
        updated_at: date + "T00:00:00-04:00",
      };
    });
}
