import { Appointment, Purchase, Transaction } from "./types";
export const revenueCategories = ["Services", "Products", "Workshops"] as const;
export type RevenueCategory = (typeof revenueCategories)[number] | "Other";
export type RevenueLine = {
  transactionId: string;
  sourceId: string;
  date: string;
  dateBasis: string;
  category: RevenueCategory;
  item: string;
  method: string;
  reference: string;
  type: "Receipt" | "Refund";
  cents: number;
};
export const salonDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function validReportDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(value + "T12:00Z").valueOf()) &&
    new Date(value + "T12:00Z").toISOString().slice(0, 10) === value
  );
}
// Allocate partial receipts in cents using the booked item prices, never today's catalog prices.
function allocate(cents: number, items: { name: string; weight: number }[]) {
  const weights = items.map((v) => Math.max(0, v.weight));
  const total = weights.reduce((n, v) => n + v, 0);
  const exact = weights.map((v) => cents * (total ? v / total : 1 / items.length));
  const amounts = exact.map(Math.floor);
  let remainder = cents - amounts.reduce((n, v) => n + v, 0);
  const order = exact
    .map((v, i) => ({ i, fraction: v - amounts[i] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const { i } of order) {
    if (remainder-- <= 0) break;
    amounts[i]++;
  }
  return items.map((v, i) => ({ item: v.name, cents: amounts[i] }));
}
export function revenueLines(
  transactions: Transaction[],
  appointments: Appointment[],
  purchases: Purchase[],
) {
  const appointmentsById = new Map(appointments.map((v) => [v.id, v]));
  const purchasesById = new Map(purchases.map((v) => [v.id, v]));
  const lines: RevenueLine[] = [];
  for (const t of transactions) {
    if (!["verified", "retained", "refund_due", "refunded"].includes(t.status)) continue;
    const a = appointmentsById.get(t.appointment_id || ""),
      p = purchasesById.get(t.purchase_id || "");
    const category: RevenueCategory = t.appointment_id
      ? "Services"
      : p?.kind === "product"
        ? "Products"
        : p?.kind === "workshop"
          ? "Workshops"
          : "Other";
    const items = a?.services?.length
      ? a.services.map((v) => ({ name: v.name, weight: Number(v.price) }))
      : p?.items?.length
        ? p.items.map((v) => ({ name: v.name, weight: Number(v.price) * Number(v.quantity) }))
        : [{ name: t.appointment_id ? "Salon services" : "Unlinked purchase", weight: 1 }];
    // Include delivery/adjustments explicitly rather than inflate individual product revenue.
    const priced = items.reduce((n, v) => n + v.weight, 0);
    if (p && Number(p.total) > priced)
      items.push({ name: "Delivery & adjustments", weight: Number(p.total) - priced });
    const allocations = allocate(Math.round(Number(t.amount) * 100), items);
    const receiptDate = t.received_at || t.created_at;
    for (const entry of allocations) {
      const base = {
        transactionId: t.id,
        sourceId: t.appointment_id || t.purchase_id || "",
        category,
        item: entry.item,
        method: t.method,
        reference: t.reference,
      };
      lines.push({
        ...base,
        type: "Receipt",
        date: salonDate(receiptDate),
        dateBasis: t.received_at ? "Received date" : "Request date fallback",
        cents: entry.cents,
      });
      if (t.status === "refunded")
        lines.push({
          ...base,
          type: "Refund",
          date: salonDate(t.refunded_at || t.created_at),
          dateBasis: t.refunded_at ? "Refund date" : "Request date fallback",
          cents: -entry.cents,
        });
    }
  }
  return lines.sort(
    (a, b) => b.date.localeCompare(a.date) || a.transactionId.localeCompare(b.transactionId),
  );
}
export function summarizeRevenue(lines: RevenueLine[]) {
  const gross = lines.filter((v) => v.type === "Receipt").reduce((n, v) => n + v.cents, 0);
  const refunds = Math.abs(
    lines.filter((v) => v.type === "Refund").reduce((n, v) => n + v.cents, 0),
  );
  const categories = [
    ...revenueCategories,
    ...(lines.some((v) => v.category === "Other") ? ["Other" as const] : []),
  ].map((category) => {
    const rows = lines.filter((v) => v.category === category);
    const received = rows.filter((v) => v.type === "Receipt").reduce((n, v) => n + v.cents, 0);
    const refunded = Math.abs(
      rows.filter((v) => v.type === "Refund").reduce((n, v) => n + v.cents, 0),
    );
    return {
      category,
      received,
      refunded,
      net: received - refunded,
      receipts: new Set(rows.filter((v) => v.type === "Receipt").map((v) => v.transactionId)).size,
    };
  });
  const items = Array.from(new Set(lines.map((v) => v.category + "\u0000" + v.item)))
    .map((key) => {
      const rows = lines.filter((v) => v.category + "\u0000" + v.item === key);
      return {
        category: rows[0].category,
        item: rows[0].item,
        net: rows.reduce((n, v) => n + v.cents, 0),
      };
    })
    .sort((a, b) => b.net - a.net);
  return { gross, refunds, net: gross - refunds, categories, items };
}
// Quote every cell; neutralize spreadsheet formulas in text fields supplied by catalog editors.
const cell = (value: string | number) => {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export function revenueCsv(lines: RevenueLine[], from: string, to: string, demo: boolean) {
  const header = [
    "Environment",
    "Period from",
    "Period to",
    "Date (Trinidad & Tobago)",
    "Date basis",
    "Entry",
    "Category",
    "Item",
    "Amount TTD",
    "Method",
    "Reference",
    "Receipt ID",
    "Booking or order ID",
  ];
  return (
    "\uFEFF" +
    [
      header,
      ...lines.map((v) => [
        demo ? "Sample data" : "Live records",
        from,
        to,
        v.date,
        v.dateBasis,
        v.type,
        v.category,
        v.item,
        v.cents / 100,
        v.method,
        v.reference,
        v.transactionId,
        v.sourceId,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
