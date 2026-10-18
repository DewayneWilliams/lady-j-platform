import { Appointment, Client, Transaction, Purchase } from "./types";
// All names, health notes, appointments and prices below are fictional demo scenarios.
const people = [
  ["Ruth", "Boaz"],
  ["Naomi", "Elimelech"],
  ["Esther", "Mordecai"],
  ["Deborah", "Barak"],
  ["Miriam", "Aaron"],
  ["Hannah", "Samuel"],
  ["Abigail", "David"],
  ["Sarah", "Abraham"],
  ["Rachel", "Jacob"],
  ["Leah", "Judah"],
  ["Mary", "Joseph"],
  ["Martha", "Lazarus"],
  ["Elizabeth", "Zachariah"],
  ["Priscilla", "Aquila"],
  ["Lydia", "Paul"],
  ["Phoebe", "Silas"],
  ["Tabitha", "Peter"],
  ["Joanna", "Chuza"],
  ["Susanna", "Daniel"],
  ["Rebecca", "Isaac"],
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
const base = new Date(today + "T10:00:00-04:00");
const upcoming: Date[] = [];
for (let day = 1; upcoming.length < 5; day++) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + day);
  if ([2, 3, 4, 5, 6].includes(next.getUTCDay())) upcoming.push(next);
}
export const demoClients: Client[] = people.map(([first_name, last_name], i) => ({
  id: "demo-client-" + i,
  first_name,
  last_name,
  full_name: first_name + " " + last_name,
  email: first_name.toLowerCase() + "@example.invalid",
  phone: "+1 868 555 " + String(100 + i).padStart(4, "0"),
  birthday: 1975 + i + "-" + String((i % 12) + 1).padStart(2, "0") + "-15",
  preferences: "Fictional client · prefers a calm appointment and clear aftercare guidance.",
  sensitivities: "Fictional health note: " + conditions[i % conditions.length],
  private_notes:
    "Bible-inspired name for demonstration only. This is not a real person or a biblical medical record.",
  photo_consent: false,
}));
export const demoAppointments: Appointment[] = people.map((_, i) => {
  const day = i < 5 ? new Date(base) : new Date(upcoming[Math.floor((i - 5) / 3)]);
  const slot = i < 5 ? i : (i - 5) % 3;
  day.setUTCMinutes(day.getUTCMinutes() + slot * 90);
  const [name, duration, price] = treatments[i];
  const end = new Date(day.getTime() + duration * 60000);
  return {
    id: "demo-appointment-" + i,
    customer_id: demoClients[i].id,
    starts_at: day.toISOString(),
    ends_at: end.toISOString(),
    kind: "appointment",
    status: i % 3 === 2 ? "pending" : "confirmed",
    services: [{ name, price }],
    total: price,
    deposit: price / 2,
    deposit_paid: i % 3 !== 2,
    note: demoClients[i].full_name,
  };
});
export const demoTransactions: Transaction[] = demoAppointments.map((a, i) => ({
  id: "demo-transaction-" + i,
  customer_id: a.customer_id,
  appointment_id: a.id,
  purchase_id: null,
  amount: i % 3 === 1 ? a.total : a.deposit,
  method: "bank",
  reference: "DEMO-" + (1000 + i),
  status: i % 3 === 2 ? "pending" : "verified",
  created_at: a.starts_at,
  received_at: i % 3 === 2 ? null : a.starts_at,
}));
export const demoPurchases: Purchase[] = [];
