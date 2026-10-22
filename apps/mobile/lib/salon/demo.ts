import { Appointment, Client, Transaction, Purchase } from "./types";
import { addCalendarDays } from "./calendarActivity";
import { demoContactPhotoPath } from "./demoProfilePhotos";
// All names, health notes, appointments and prices below are fictional demo scenarios.
const people = [
  ["Geralt", "of Rivia"],
  ["Yennefer", "of Vengerberg"],
  ["Cirilla", "Fiona"],
  ["Jaskier", "Pankratz"],
  ["Triss", "Merigold"],
  ["Tissaia", "de Vries"],
  ["Fringilla", "Vigo"],
  ["Cahir", "Mawr Dyffryn"],
  ["Queen", "Calanthe"],
  ["Istredd", "of Aedd Gynvael"],
  ["Vilgefortz", "of Roggeveen"],
  ["Mousesack", "of Cintra"],
  ["Renfri", "of Creyden"],
  ["Stregobor", "of Kovir"],
  ["Dara", "of Cintra"],
  ["Emhyr", "var Emreis"],
  ["Philippa", "Eilhart"],
  ["Dijkstra", "of Redania"],
  ["Nenneke", "of Ellander"],
  ["Vesemir", "of Kaer Morhen"],
];
const treatments = [
  ["Silk press", 90, 350],
  ["Gel manicure", 60, 200],
  ["Hydrating facial", 60, 450],
  ["Classic lash extensions", 90, 500],
  ["Scalp treatment", 45, 250],
  ["Protective twist styling", 90, 400],
  ["Spa pedicure", 60, 250],
  ["Brow shaping", 30, 100],
  ["Lash lift and tint", 60, 350],
  ["Deep conditioning treatment", 60, 220],
  ["Natural hair trim", 30, 150],
  ["Gentle facial", 60, 380],
  ["Acrylic nail refill", 75, 280],
  ["Wash and blow-dry", 60, 240],
  ["Brow tint", 30, 120],
  ["Braided updo", 90, 450],
  ["Nail polish refresh", 30, 100],
  ["Lash extension removal", 30, 130],
  ["Relaxing scalp massage", 30, 160],
  ["Makeup consultation", 60, 300],
  ["Loc maintenance", 90, 420],
  ["Signature blowout", 60, 280],
  ["Spa manicure", 45, 180],
  ["Brightening facial", 75, 480],
  ["Hybrid lash extensions", 105, 580],
  ["Hot oil treatment", 45, 240],
  ["Cornrow styling", 90, 390],
  ["Callus care pedicure", 75, 300],
  ["Brow lamination", 45, 220],
  ["Special occasion makeup", 90, 520],
] as [string, number, number][];
const conditions = [
  "Fragrance sensitivity; use unscented products.",
  "Diabetes; confirm foot-care suitability and avoid aggressive exfoliation.",
  "Sensitive skin; discuss a patch test.",
  "Latex allergy; use latex-free supplies.",
  "Scalp eczema; assess irritation before treatment.",
  "Asthma triggered by strong scents; maintain ventilation.",
  "Adhesive sensitivity; patch test before lash services.",
  "Dry skin; choose gentle hydration.",
  "Pregnancy; review positioning and product suitability.",
  "No sensitivities disclosed; confirm before service.",
];
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Port_of_Spain",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const weekday = new Date(today + "T12:00:00Z").getUTCDay();
const daysUntilNextMonday = ((8 - weekday) % 7) || 7;
const nextMonday = addCalendarDays(today, daysUntilNextMonday);
const nextWeekDates = Array.from({ length: 5 }, (_, index) => addCalendarDays(nextMonday, index + 1));
const appointmentTimes = ["06:30", "08:15", "10:00", "12:00", "14:15", "17:00"];
const contactPhotoIndexes = [1, 0, 2, 3, 10, 15, 7, 4, 12, 13, 6, 9, 5, 1, 4, 11, 8, 6, 15, 6];
export const demoClients: Client[] = people.map(([first_name, last_name], i) => ({
  id: "demo-client-" + i,
  first_name,
  last_name,
  full_name: first_name + " " + last_name,
  email: first_name.toLowerCase() + "@example.invalid",
  phone: "+1 868 555 " + String(100 + i).padStart(4, "0"),
  birthday:
    (i === 2 ? new Date().getUTCFullYear() - 15 : 1975 + i) +
    "-" +
    String((i % 12) + 1).padStart(2, "0") +
    "-15",
  is_minor: i === 2,
  guardian_name: i === 2 ? "Geralt of Rivia" : "",
  medical_conditions: conditions[i % conditions.length],
  preferences: "Prefers a calm appointment and clear aftercare guidance.",
  sensitivities: conditions[i % conditions.length],
  private_notes: "Confirm aftercare preferences.",
  photo_consent: false,
  client_photo_path: demoContactPhotoPath(contactPhotoIndexes[i]),
  profile_photo_updated_at: "demo",
}));
export const demoAppointments: Appointment[] = nextWeekDates.flatMap((date, dayOffset) =>
  appointmentTimes.map((start, slot) => {
    const i = dayOffset * appointmentTimes.length + slot;
    const client = demoClients[i % demoClients.length];
    const startsAt = new Date(`${date}T${start}:00-04:00`);
    const [name, duration, price] = treatments[i];
    const pending = [2, 11, 23].includes(i);
    return {
      id: "demo-appointment-" + i,
      customer_id: client.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + duration * 60000).toISOString(),
      kind: "appointment",
      status: pending ? "pending" : "confirmed",
      services: [{ name, price }],
      total: price,
      deposit: price / 2,
      deposit_paid: !pending,
      note: client.full_name,
    };
  }),
);
const paymentDate = new Date().toISOString();
export const demoTransactions: Transaction[] = demoAppointments.flatMap((a, i) => {
  const pending = a.status === "pending";
  const deposit: Transaction = {
    id: "demo-transaction-" + i,
    customer_id: a.customer_id,
    appointment_id: a.id,
    purchase_id: null,
    amount: a.deposit,
    method: "bank",
    reference: "LJ-" + (1000 + i),
    status: pending ? "pending" : "verified",
    created_at: paymentDate,
    received_at: pending ? null : paymentDate,
  };
  if (pending || i % 4 !== 1) return [deposit];
  return [
    deposit,
    {
      ...deposit,
      id: deposit.id + "-balance",
      amount: a.total - a.deposit,
      reference: "LJ-BAL-" + (1000 + i),
    },
  ];
});
export const demoPurchases: Purchase[] = [];
