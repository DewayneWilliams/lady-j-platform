import { Appointment } from "./types";
import { addCalendarDays } from "./calendarActivity";
/** Fictional Bible-inspired salon scenarios, used only in the labeled owner demo. */
export function createOwnerCalendarDemo(day: string): Appointment[] {
  // Keep the all-day example on a closed day beyond the other demo activities.
  const restOffset =
    Array.from({ length: 7 }, (_, i) => i + 7).find((offset) =>
      [0, 1].includes(new Date(addCalendarDays(day, offset) + "T12:00:00Z").getUTCDay()),
    ) || 7;
  const examples = [
    {
      id: "david",
      offset: 0,
      start: "06:00",
      end: "06:30",
      reason: "personal",
      text: "David’s quiet time · Demo rest period inspired by David’s reflective songs.",
    },
    {
      id: "esther",
      offset: 0,
      start: "08:00",
      end: "08:30",
      reason: "vip",
      text: "Esther’s royal visit · Demo VIP preparation inspired by Esther’s royal audience.",
    },
    {
      id: "solomon",
      offset: 0,
      start: "08:45",
      end: "09:15",
      reason: "consultation",
      text: "Solomon’s counsel · Demo consultation inspired by Solomon’s wisdom.",
    },
    {
      id: "noah",
      offset: 0,
      start: "18:30",
      end: "19:30",
      reason: "event",
      text: "Noah’s craftsmanship workshop · Demo event inspired by the building of the ark.",
    },
    {
      id: "rest",
      offset: restOffset,
      start: "00:00",
      end: "00:00",
      reason: "day_off",
      text: "A time to rest · Demo day off inspired by the Bible’s theme of rest.",
      allDay: true,
    },
    {
      id: "naomi",
      offset: 2,
      start: "19:00",
      end: "19:30",
      reason: "vip",
      text: "Ruth and Naomi’s reunion · Demo VIP visit inspired by their return together.",
    },
    {
      id: "lydia",
      offset: 3,
      start: "19:00",
      end: "20:00",
      reason: "event",
      text: "Lydia’s textile workshop · Demo event inspired by Lydia’s work with purple goods.",
    },
    {
      id: "nehemiah",
      offset: 4,
      start: "19:00",
      end: "19:45",
      reason: "consultation",
      text: "Nehemiah’s planning meeting · Demo consultation inspired by rebuilding Jerusalem’s walls.",
    },
    {
      id: "martha",
      offset: 5,
      start: "19:00",
      end: "19:30",
      reason: "other",
      text: "Martha’s hospitality preparation · Demo custom block inspired by welcoming guests.",
    },
  ];
  return examples.map((example) => {
    const date = addCalendarDays(day, example.offset),
      endDate = example.allDay ? addCalendarDays(date, 1) : date;
    return {
      id: "demo-calendar-" + example.id,
      customer_id: "",
      starts_at: date + "T" + example.start + ":00-04:00",
      ends_at: endDate + "T" + example.end + ":00-04:00",
      kind: "block",
      status: "confirmed",
      services: [],
      total: 0,
      deposit: 0,
      deposit_paid: false,
      note: example.text,
      block_description:
        example.text + " Fictional example; not a real appointment or a Bible quotation.",
      block_reason: example.reason,
      all_day: example.allDay || false,
      block_repeat: "none",
      updated_at: date + "T00:00:00-04:00",
    };
  });
}
