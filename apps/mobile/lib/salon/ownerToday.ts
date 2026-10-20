import { displayDate } from "./dates";
import { Appointment } from "./types";

export function salonDayKey(date: string | Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function headerDate(date: string | Date) {
  return displayDate(date);
}

export function appointmentsForToday(appointments: Appointment[], day: string) {
  return appointments
    .filter(
      (a) =>
        a.kind === "appointment" && a.status !== "cancelled" && salonDayKey(a.starts_at) === day,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

// Owner-only verses and references are preserved exactly as supplied.
const verses = [
  {
    text: "This is the day that Jehovah has made; We will be joyful and rejoice in it.",
    reference: "Psalm 118:24",
    url: "https://www.jw.org/en/library/bible/study-bible/books/psalms/118/",
  },
  {
    text: "For all things I have the strength through the one who gives me power.",
    reference: "Philippians 4:13",
    url: "https://www.jw.org/en/library/bible/study-bible/books/philippians/4/",
  },
  {
    text: "Commit to Jehovah whatever you do, And your plans will succeed.",
    reference: "Proverbs 16:3",
    url: "https://www.jw.org/en/library/bible/study-bible/books/proverbs/16/",
  },
  {
    text: "Let everything you do be done with love.",
    reference: "1 Corinthians 16:14",
    url: "https://www.jw.org/en/library/bible/study-bible/books/1-corinthians/16/",
  },
  {
    text: "Therefore, keep encouraging one another and building one another up, just as you are in fact doing.",
    reference: "1 Thessalonians 5:11",
    url: "https://www.jw.org/en/library/bible/study-bible/books/1-thessalonians/5/",
  },
  {
    text: "May Jehovah bless you and safeguard you.",
    reference: "Numbers 6:24",
    url: "https://www.jw.org/en/library/bible/study-bible/books/numbers/6/",
  },
] as const;

export function dailyBibleVerse(day: string) {
  const index = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000);
  return verses[((index % verses.length) + verses.length) % verses.length];
}
