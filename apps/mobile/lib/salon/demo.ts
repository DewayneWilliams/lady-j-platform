import { Appointment, Client, Transaction, Purchase } from "./types";
// All names, health notes, appointments and prices below are fictional demo scenarios.
const people = [
  ["Ruth", "Williams"],
  ["Esther", "James"],
  ["David", "Brown"],
  ["Martha", "Thomas"],
  ["Daniel", "Clarke"],
  ["Miriam", "Lewis"],
  ["Naomi", "Adams"],
  ["Deborah", "Wilson"],
  ["Hannah", "Taylor"],
  ["Mary", "Martin"],
  ["Lydia", "Walker"],
  ["Sarah", "Roberts"],
  ["Daenerys", "Targaryen"],
  ["Arya", "Stark"],
  ["Sansa", "Stark"],
  ["Rhaenyra", "Targaryen"],
  ["Alicent", "Hightower"],
  ["Cersei", "Lannister"],
  ["Jon", "Snow"],
  ["Brienne", "Tarth"],
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
export const demoClients: Client[] = people.map(([first_name, last_name], i) => ({
  id: "demo-client-" + i,
  first_name,
  last_name,
  full_name: first_name + " " + last_name,
  email: first_name.toLowerCase() + "@example.invalid",
  phone: "+1 868 555 " + String(100 + i).padStart(4, "0"),
  birthday:
    (i === 13 ? new Date().getUTCFullYear() - 15 : 1975 + i) +
    "-" +
    String((i % 12) + 1).padStart(2, "0") +
    "-15",
  is_minor: i === 13,
  guardian_name: i === 13 ? "Ned Stark" : "",
  medical_conditions: conditions[i % conditions.length],
  preferences: "Prefers a calm appointment and clear aftercare guidance.",
  sensitivities: conditions[i % conditions.length],
  private_notes: "Confirm aftercare preferences.",
  photo_consent: false,
}));
export const demoAppointments: Appointment[] = Array.from({ length: 14 }, (_, dayOffset) =>
  Array.from({ length: 2 + (dayOffset % 3) }, (_, slot) => {
    const i = dayOffset * 4 + slot;
    const client = demoClients[i % demoClients.length];
    const day = new Date(base);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    day.setUTCMinutes(day.getUTCMinutes() + slot * 120);
    const consult = slot === 0;
    const [name, duration, price] = consult
      ? (["Consult", 30, 100] as const)
      : treatments[i % treatments.length];
    return {
      id: "demo-appointment-" + i,
      customer_id: client.id,
      starts_at: day.toISOString(),
      ends_at: new Date(day.getTime() + duration * 60000).toISOString(),
      kind: "appointment",
      status: slot === 1 && [0, 1, 3].includes(dayOffset) ? "pending" : "confirmed",
      services: [{ name, price }],
      total: price,
      deposit: price / 2,
      deposit_paid: !(slot === 1 && [0, 1, 3].includes(dayOffset)),
      note: client.full_name,
    };
  }),
).flat();
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
