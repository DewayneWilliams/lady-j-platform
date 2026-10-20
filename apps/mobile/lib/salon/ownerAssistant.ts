import { Appointment, Product, Purchase, Transaction, money, timeLabel } from "./types";
import { appointmentPayment } from "./appointmentPayment";
export type WaitlistEntry = {
  id: string;
  customer_id: string;
  requested_date: string;
  service_ids: string[];
  service_names: string[];
  duration: number;
  status: string;
  created_at: string;
  last_notified_at: string | null;
};
export type Expense = {
  id: string;
  spent_on: string;
  category: string;
  description: string;
  amount: number;
  reference: string;
};
export type AttentionItem = {
  key: string;
  title: string;
  detail: string;
  section: string;
  count: number;
};
export const isLowStock = (product: Product) =>
  product.active &&
  (product.reorder_level ?? 3) > 0 &&
  product.stock <= (product.reorder_level ?? 3);
export function ownerAttention(
  appointments: Appointment[],
  transactions: Transaction[],
  purchases: Purchase[],
  products: Product[],
  waiting: WaitlistEntry[],
  failedMessages = 0,
): AttentionItem[] {
  const payments = transactions.filter((t) => t.status === "pending");
  const refunds = transactions.filter((t) => t.status === "refund_due");
  const balances = appointments.filter(
    (a) =>
      a.kind === "appointment" &&
      a.status === "completed" &&
      appointmentPayment(a, transactions).remaining > 0,
  );
  const orders = purchases.filter(
    (p) => p.kind === "product" && ["paid", "processing", "ready"].includes(p.status),
  );
  const low = products.filter(isLowStock);
  return [
    {
      key: "payments",
      title: "Outstanding payments",
      detail:
        payments.length +
        (payments.length === 1 ? " payment needs verification." : " payments need verification."),
      section: "Payments",
      count: payments.length,
    },
    {
      key: "refunds",
      title: "Review refunds due",
      detail: "Record each refund after you have returned the funds.",
      section: "Payments",
      count: refunds.length,
    },
    {
      key: "balances",
      title: "Settle completed visits",
      detail:
        money(balances.reduce((sum, a) => sum + appointmentPayment(a, transactions).remaining, 0)) +
        " remains to be recorded.",
      section: "Balances",
      count: balances.length,
    },
    {
      key: "orders",
      title: "Prepare or hand over orders",
      detail: "Paid orders awaiting preparation, delivery or collection.",
      section: "Orders",
      count: orders.length,
    },
    {
      key: "stock",
      title: "Product inventory low",
      detail: low.map((product) => product.name + " · " + product.stock + " left").join(", "),
      section: "Products",
      count: low.length,
    },
    {
      key: "waitlist",
      title: "Review the waitlist",
      detail: "Clients hoping for a time on an upcoming salon day.",
      section: "Waitlist",
      count: waiting.filter((w) => w.status === "waiting").length,
    },
    {
      key: "messages",
      title: "Check email delivery",
      detail: "Messages need review before they can be sent.",
      section: "Automation",
      count: failedMessages,
    },
  ].filter((item) => item.count > 0);
}
export function dailyBrief(today: Appointment[], now = new Date()) {
  const upcoming = today
    .filter((a) => ["pending", "confirmed"].includes(a.status) && new Date(a.ends_at) > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = upcoming[0];
  if (!next)
    return today.length
      ? "No more visits are scheduled later today. Review any outstanding balances below."
      : "Your calendar is open today. You can add a visit or protect time for yourself.";
  const service = next.services?.map((s) => s.name).join(" + ") || "Salon appointment";
  return (
    (new Date(next.starts_at) <= now
      ? "In progress: "
      : "Next at " + timeLabel(next.starts_at) + ": ") +
    service +
    ". " +
    upcoming.length +
    (upcoming.length === 1 ? " visit remaining today." : " visits remaining today.")
  );
}
