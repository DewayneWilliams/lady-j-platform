import type { Appointment, Client, Product, Purchase, Service, Transaction } from "./types";
import type { Expense } from "./ownerAssistant";
import { money } from "./types";
import { appointmentPayment } from "./appointmentPayment";
import { localCalendarTime } from "./calendarActivity";
import { revenueLines, salonDate, validReportDate } from "./revenueReport";

export const ownerReports = [
  "Revenue & Payments",
  "Appointments",
  "Clients",
  "Services Performance",
  "Product Orders",
  "Inventory",
  "Expenses & Profit",
  "Staff Performance",
] as const;
export type OwnerReport = (typeof ownerReports)[number];
export type ReportRange = { from: string; to: string };
export type ReportRecords = {
  appointments: Appointment[];
  transactions: Transaction[];
  products: Product[];
  clients: Client[];
  purchases: Purchase[];
  services: Service[];
  expenses: Expense[];
  demo: boolean;
};
export type ReportDocument = {
  title: OwnerReport;
  businessName: string;
  range: ReportRange;
  generatedAt: string;
  sample: boolean;
  summary: { label: string; value: string | number }[];
  notes: string[];
  headers: string[];
  rows: (string | number)[][];
};
const cents = (value: number) => Math.round(Number(value) * 100);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export function validateReportRange(range: ReportRange) {
  if (!validReportDate(range.from) || !validReportDate(range.to) || range.from > range.to)
    throw new Error("Choose a valid date range.");
}
export function buildOwnerReport(
  kind: OwnerReport,
  records: ReportRecords,
  range: ReportRange,
  businessName: string,
): ReportDocument {
  validateReportRange(range);
  const within = (date: string) => date >= range.from && date <= range.to;
  const visits = records.appointments.filter(
    (a) => a.kind === "appointment" && within(salonDate(a.starts_at)),
  );
  const booked = visits.filter((a) => !["cancelled", "no_show"].includes(a.status));
  const lines = revenueLines(records.transactions, records.appointments, records.purchases).filter(
    (line) => within(line.date),
  );
  const transactionById = new Map(records.transactions.map((t) => [t.id, t]));
  const name = (id: string | null) =>
    id
      ? records.clients.find((c) => c.id === id || c.customer_id === id)?.full_name || "Client"
      : "Walk-in";
  const receipts = sum(lines.filter((l) => l.type === "Receipt").map((l) => l.cents));
  const refunds = Math.abs(sum(lines.filter((l) => l.type === "Refund").map((l) => l.cents)));
  const net = receipts - refunds;
  const promotionalDiscounts =
    sum(booked.map((appointment) => cents(Number(appointment.discount_total || 0)))) +
    sum(
      records.purchases
        .filter((purchase) => within(salonDate(purchase.created_at)))
        .map((purchase) => cents(Number(purchase.discount_total || 0))),
    );
  const amounts = [
    { label: "Receipts", value: money(receipts / 100) },
    { label: "Refunds", value: money(refunds / 100) },
    { label: "Net Receipts", value: money(net / 100) },
  ];
  // Payments are recorded as individual receipts. This retains each portion of a mixed payment
  // instead of labelling the entire booking with one method or counting it twice.
  const receiptMethods = new Map<string, number>();
  lines
    .filter((line) => line.type === "Receipt")
    .forEach((line) => {
      const label =
        line.method === "bank"
          ? "Bank Transfer"
          : line.method === "cash"
            ? "Cash Received"
            : line.method;
      receiptMethods.set(label, (receiptMethods.get(label) || 0) + line.cents);
    });
  const doc: ReportDocument = {
    title: kind,
    businessName,
    range,
    generatedAt: new Date().toISOString(),
    sample: records.demo,
    summary: [],
    notes: ["Currency: TTD. Dates: Trinidad and Tobago (UTC-4)."],
    headers: [],
    rows: [],
  };
  if (lines.some((l) => l.dateBasis.includes("fallback")))
    doc.notes.push(
      "Some legacy receipts/refunds use the original request date because a receipt/refund date was not recorded.",
    );
  if (kind === "Revenue & Payments") {
    const pending = records.transactions.filter(
      (t) => t.status === "pending" && within(salonDate(t.created_at)),
    );
    doc.summary = [
      ...amounts,
      ...[...receiptMethods].map(([label, cents]) => ({ label, value: money(cents / 100) })),
      { label: "Promotional Discounts", value: money(promotionalDiscounts / 100) },
      { label: "Pending Requests", value: pending.length },
    ];
    doc.notes.push(
      "Only confirmed receipts count as cash received. Pending requests are shown separately and excluded from totals.",
    );
    doc.headers = [
      "Date",
      "Type",
      "Client",
      "Category",
      "Item",
      "Method",
      "Status",
      "Amount TTD",
      "Reference",
      "Date Basis",
    ];
    doc.rows = lines.map((l) => [
      l.date,
      l.type,
      name(transactionById.get(l.transactionId)?.customer_id || null),
      l.category,
      l.item,
      l.method === "bank" ? "Bank Transfer" : l.method === "cash" ? "Cash Received" : l.method,
      transactionById.get(l.transactionId)?.status || "",
      l.cents / 100,
      l.reference || "",
      l.dateBasis,
    ]);
    doc.rows.push(
      ...pending.map((t) => [
        salonDate(t.created_at),
        "Pending Request",
        name(t.customer_id),
        "",
        "Awaiting verification",
        t.method === "bank" ? "Bank Transfer" : t.method === "cash" ? "Cash Received" : t.method,
        t.status,
        Number(t.amount),
        t.reference || "",
        "Request date",
      ]),
    );
  } else if (kind === "Appointments") {
    doc.summary = [
      { label: "Appointments", value: visits.length },
      { label: "Completed", value: visits.filter((v) => v.status === "completed").length },
      { label: "Booked Value", value: money(sum(booked.map((a) => cents(a.total))) / 100) },
      {
        label: "Balance Due",
        value: money(
          sum(booked.map((a) => cents(appointmentPayment(a, records.transactions).remaining))) /
            100,
        ),
      },
    ];
    doc.notes.push(
      "Filtered by appointment start date. Receipt and balance columns show the current verified payment position; booked value excludes cancellations and no-shows.",
    );
    doc.headers = [
      "Start",
      "End",
      "Client",
      "Service",
      "Status",
      "Total TTD",
      "Discount TTD",
      "Received TTD",
      "Balance TTD",
    ];
    doc.rows = visits.map((a) => [
      localCalendarTime(a.starts_at).replace("T", " "),
      localCalendarTime(a.ends_at).replace("T", " "),
      name(a.client_id || a.customer_id),
      (Array.isArray(a.services) ? a.services : [])
        .map((s) => String(s?.name ?? "Service"))
        .join(" + ") || "Service",
      a.status,
      Number(a.total),
      Number(a.discount_total || 0),
      appointmentPayment(a, records.transactions).received,
      appointmentPayment(a, records.transactions).remaining,
    ]);
  } else if (kind === "Clients") {
    const clients = records.clients
      .filter((c) => !c.deleted_at)
      .sort((a, b) => String(a?.full_name ?? "").localeCompare(String(b?.full_name ?? "")));
    doc.summary = [
      { label: "Directory Clients", value: clients.length },
      {
        label: "Clients With Visits",
        value: new Set(visits.map((a) => a.client_id || a.customer_id).filter(Boolean)).size,
      },
    ];
    doc.notes.push(
      "Current client directory; visits and receipts reflect the selected dates. Private notes, medical details and dates of birth are excluded.",
    );
    doc.headers = ["Client", "Email", "Mobile Number", "Visits", "Completed", "Net Receipts TTD"];
    doc.rows = clients.map((client) => {
      const ids = [client.id, client.customer_id].filter((id): id is string => !!id);
      const history = visits.filter(
        (a) => !!(a.client_id || a.customer_id) && ids.includes((a.client_id || a.customer_id)!),
      );
      const received = sum(
        lines
          .filter((l) => ids.includes(transactionById.get(l.transactionId)?.customer_id || ""))
          .map((l) => l.cents),
      );
      return [
        client.full_name,
        client.email || "",
        client.phone || "",
        history.length,
        history.filter((a) => a.status === "completed").length,
        received / 100,
      ];
    });
  } else if (kind === "Services Performance") {
    const groups = new Map<
      string,
      { visits: number; completed: number; booked: number; cash: number }
    >();
    const group = (name: string) => {
      if (!groups.has(name)) groups.set(name, { visits: 0, completed: 0, booked: 0, cash: 0 });
      return groups.get(name)!;
    };
    for (const a of visits) {
      const appointmentServices = Array.isArray(a.services) ? a.services : [];
      const totalWeight = sum(appointmentServices.map((s) => Math.max(0, cents(s?.price ?? 0))));
      let remaining = cents(a.total);
      appointmentServices.forEach((service, index) => {
        const part =
          index === appointmentServices.length - 1
            ? remaining
            : Math.floor(
                cents(a.total) *
                  (totalWeight
                    ? Math.max(0, cents(service.price)) / totalWeight
                    : 1 / Math.max(1, appointmentServices.length)),
              );
        remaining -= part;
        const entry = group(service.name);
        entry.visits++;
        if (a.status === "completed") entry.completed++;
        if (!["cancelled", "no_show"].includes(a.status)) entry.booked += part;
      });
    }
    for (const l of lines.filter((l) => l.category === "Services")) group(l.item).cash += l.cents;
    doc.summary = [
      { label: "Services With Activity", value: groups.size },
      { label: "Completed Visits", value: visits.filter((a) => a.status === "completed").length },
      {
        label: "Service Net Receipts",
        value: money(sum([...groups.values()].map((g) => g.cash)) / 100),
      },
    ];
    doc.notes.push(
      "Bookings use appointment dates; cash uses receipt/refund dates. Recorded appointment prices are used, preserving historical discounts.",
    );
    doc.headers = [
      "Service",
      "Category",
      "Bookings",
      "Completed",
      "Booked Value TTD",
      "Net Receipts TTD",
    ];
    doc.rows = [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, g]) => [
        name,
        records.services.find((s) => s.name === name)?.category || "Historical / Custom",
        g.visits,
        g.completed,
        g.booked / 100,
        g.cash / 100,
      ]);
  } else if (kind === "Product Orders") {
    const orders = records.purchases.filter(
      (purchase) => purchase.kind === "product" && within(salonDate(purchase.created_at)),
    );
    const verified = orders.filter(
      (order) =>
        order.payment_status === "verified" ||
        ["paid", "processing", "ready", "fulfilled"].includes(order.status),
    );
    doc.summary = [
      { label: "Orders", value: orders.length },
      {
        label: "Awaiting Verification",
        value: orders.filter(
          (order) => (order.payment_status || "awaiting_verification") === "awaiting_verification",
        ).length,
      },
      {
        label: "Verified Order Value",
        value: money(sum(verified.map((order) => cents(order.total))) / 100),
      },
      {
        label: "Fulfilled",
        value: orders.filter((order) => (order.fulfillment_status || order.status) === "fulfilled")
          .length,
      },
    ];
    doc.notes.push(
      "Order submission is separate from payment verification. Only owner-verified orders are included in verified value.",
    );
    doc.headers = [
      "Order Number",
      "Date",
      "Customer",
      "Products",
      "Payment",
      "Fulfillment",
      "Method",
      "Total TTD",
    ];
    doc.rows = orders.map((order) => [
      order.order_number || order.id,
      salonDate(order.created_at),
      order.contact_name || name(order.customer_id),
      order.items.map((item) => `${item.name} x ${item.quantity}`).join("; "),
      order.payment_status || order.status,
      order.fulfillment_status || order.status,
      order.payment_method === "bank" || !order.payment_method
        ? "Bank Wire Transfer"
        : order.payment_method,
      Number(order.total),
    ]);
  } else if (kind === "Inventory") {
    const products = records.products;
    doc.summary = [
      { label: "Products", value: products.length },
      { label: "Units In Stock", value: sum(products.map((p) => Number(p.stock))) },
      {
        label: "Retail Stock Value",
        value: money(sum(products.map((p) => cents(p.price) * Number(p.stock))) / 100),
      },
    ];
    doc.notes.push(
      "Current stock snapshot at export time; historical stock is not recorded. Retail value is not inventory cost. Paid-order units use order dates within the selected period.",
    );
    const paidOrders = records.purchases.filter(
      (p) =>
        p.kind === "product" &&
        ["paid", "processing", "ready", "fulfilled"].includes(p.status) &&
        within(salonDate(p.created_at)),
    );
    doc.headers = [
      "Product",
      "Brand",
      "Category",
      "Stock",
      "Unit Price TTD",
      "Retail Value TTD",
      "Low Stock",
      "Paid-Order Units",
      "Available",
    ];
    doc.rows = products.map((p) => [
      p.name,
      p.brand || "",
      p.category,
      Number(p.stock),
      Number(p.price),
      (cents(p.price) * Number(p.stock)) / 100,
      p.stock <= (p.reorder_level ?? 3) && (p.reorder_level ?? 3) > 0 ? "Yes" : "No",
      sum(
        paidOrders.flatMap((o) =>
          o.items.filter((i) => i.id === p.id).map((i) => Number(i.quantity)),
        ),
      ),
      p.active ? "Yes" : "No",
    ]);
  } else if (kind === "Expenses & Profit") {
    const expenses = records.expenses.filter((e) => within(e.spent_on));
    const spent = sum(expenses.map((e) => cents(e.amount)));
    doc.summary = [
      ...amounts,
      { label: "Recorded Expenses", value: money(spent / 100) },
      { label: "Cash Surplus / Deficit", value: money((net - spent) / 100) },
    ];
    doc.notes.push(
      "Cash basis: net receipts minus recorded expenses. This is not accounting profit; unrecorded costs, inventory cost, tax and depreciation are not included.",
    );
    doc.headers = ["Date", "Category", "Description", "Amount TTD", "Reference"];
    doc.rows = expenses
      .sort((a, b) => a.spent_on.localeCompare(b.spent_on))
      .map((e) => [e.spent_on, e.category, e.description, Number(e.amount), e.reference || ""]);
  } else {
    const serviceCash = sum(lines.filter((l) => l.category === "Services").map((l) => l.cents));
    doc.summary = [
      { label: "Completed Visits", value: visits.filter((a) => a.status === "completed").length },
      { label: "Service Net Receipts", value: money(serviceCash / 100) },
    ];
    doc.notes.push(
      "No staff assignments are recorded. These salon-wide, unassigned totals cannot rank individual staff. Bookings use appointment dates; receipts use payment dates.",
    );
    doc.headers = [
      "Staff Assignment",
      "Appointments",
      "Completed",
      "Booked Value TTD",
      "Service Net Receipts TTD",
    ];
    doc.rows = [
      [
        "Unassigned",
        visits.length,
        visits.filter((a) => a.status === "completed").length,
        sum(booked.map((a) => cents(a.total))) / 100,
        serviceCash / 100,
      ],
    ];
  }
  return doc;
}
const cell = (value: string | number) => {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export function ownerReportCsv(doc: ReportDocument) {
  const rows: (string | number)[][] = [
    [doc.businessName],
    [doc.title],
    ["From", doc.range.from, "To", doc.range.to],
    ["Generated", localCalendarTime(doc.generatedAt)],
    [doc.sample ? "Sample data" : "Live records"],
    ...doc.summary.map((s) => [s.label, s.value]),
    ...doc.notes.map((note) => [note]),
    [],
    doc.headers,
    ...doc.rows,
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
