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
const demoDates = Array.from({ length: 14 }, (_, index) => addCalendarDays(today, index));
const regularTimes = ["10:00", "11:45", "14:00", "16:15"];
const vipTimes = ["07:00", "10:00", "14:00", "18:30"];
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
  health_safety_notes: conditions[i % conditions.length],
  client_accommodations:
    i % 2 === 0
      ? "Prefers a quiet appointment and an extra neck cushion."
      : "Allow a brief stretch break during longer services.",
  preferences: "Prefers a calm appointment and clear aftercare guidance.",
  sensitivities: conditions[i % conditions.length],
  private_notes: "Confirm aftercare preferences.",
  photo_consent: false,
  client_photo_path: demoContactPhotoPath(contactPhotoIndexes[i]),
  profile_photo_updated_at: "demo",
}));
const historyClients = [...demoClients]
  .sort((a, b) => a.full_name.localeCompare(b.full_name, "en", { sensitivity: "base" }))
  .slice(0, 2);
const demoCompletedHistory: Appointment[] = historyClients.flatMap((client, clientIndex) =>
  [
    [12 + clientIndex * 3, "Silk press and trim", 90, 420],
    [38 + clientIndex * 4, "Hydrating facial", 60, 450],
  ].map(([daysAgo, name, duration, total], visitIndex) => {
    const startsAt = new Date(Date.now() - Number(daysAgo) * 86400000);
    startsAt.setUTCHours(14 + visitIndex * 2, 0, 0, 0);
    return {
      id: `demo-history-${client.id}-${visitIndex}`,
      customer_id: client.id,
      client_id: client.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + Number(duration) * 60000).toISOString(),
      kind: "appointment",
      status: "completed",
      services: [{ name: String(name), price: Number(total) }],
      total: Number(total),
      deposit: Number(total) / 2,
      deposit_paid: true,
      note: `DEMO history · ${client.full_name}`,
      is_vip: false,
      vip_percentage: null,
      vip_premium: 0,
    } as Appointment;
  }),
);

const demoUpcomingAppointments: Appointment[] = demoDates.flatMap((date, dayOffset) =>
  (() => {
    const weekday = new Date(date + "T12:00:00Z").getUTCDay();
    const closedDay = weekday === 0 || weekday === 1;
    const times = closedDay
      ? vipTimes
      : dayOffset % 3 === 1
        ? ["10:00", "11:45", "14:00", "18:30"]
        : regularTimes;
    return times.map((start, slot) => {
      const i = dayOffset * 4 + slot;
      const client = demoClients[i % demoClients.length];
      const startsAt = new Date(`${date}T${start}:00-04:00`);
      const consultation = !closedDay && slot === 1 && dayOffset % 4 === 0;
      const [serviceName, serviceDuration, price] = treatments[i % treatments.length];
      const name = consultation ? "Free Consultation" : serviceName;
      const duration = consultation ? 15 : Math.min(serviceDuration, 90);
      const cancelled = !closedDay && slot === 2 && dayOffset % 4 === 2;
      const vip = closedDay || start === "18:30";
      const pending = vip || (!cancelled && i % 7 === 2);
      const percentage = closedDay ? 30 : vip ? 20 : null;
      const subtotal = consultation ? 0 : closedDay ? Math.max(250, price) : price;
      return {
        id: "demo-appointment-" + i,
        customer_id: client.id,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + duration * 60000).toISOString(),
        kind: "appointment",
        status: cancelled ? "cancelled" : pending ? "pending" : "confirmed",
        services: [{ name, price: consultation ? 0 : price, duration }],
        total: subtotal + Math.round(subtotal * Number(percentage || 0)) / 100,
        deposit: (subtotal + Math.round(subtotal * Number(percentage || 0)) / 100) / 2,
        deposit_paid: !pending,
        note: `DEMO · ${client.full_name}`,
        is_vip: vip,
        vip_percentage: percentage,
        vip_premium: vip ? Math.round(subtotal * Number(percentage)) / 100 : 0,
        approval_status: vip ? "pending" : undefined,
      };
    });
  })(),
);
export const demoAppointments: Appointment[] = [
  ...demoCompletedHistory,
  ...demoUpcomingAppointments,
];
const paymentDate = new Date().toISOString();
export const demoTransactions: Transaction[] = demoAppointments.flatMap((a, i) => {
  if (a.id.startsWith("demo-history-"))
    return [
      {
        id: "demo-history-transaction-" + i,
        customer_id: a.customer_id,
        appointment_id: a.id,
        purchase_id: null,
        amount: a.total,
        method: "bank",
        reference: "DEMO-PAID-" + (1000 + i),
        status: "verified",
        created_at: a.starts_at,
        received_at: a.starts_at,
      } as Transaction,
    ];
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
