import { Appointment, Transaction } from "./types";

/** A completed service never implies a settled balance. Only verified receipts count. */
export function appointmentPayment(appointment: Appointment, transactions: Transaction[]) {
  const received = transactions
    .filter((t) => t.appointment_id === appointment.id && t.status === "verified")
    .reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);
  const total = Math.round(Number(appointment.total) * 100);
  const state =
    total >= 0 && received >= total
      ? "paid"
      : appointment.deposit_paid || received > 0
        ? "deposit"
        : "pending";
  return {
    state,
    received: received / 100,
    depositReceived:
      Math.min(received, Math.max(0, Math.round(Number(appointment.deposit) * 100))) / 100,
    label:
      state === "paid"
        ? "Paid in full"
        : state === "deposit"
          ? "Deposit received"
          : "Payment pending",
    remaining: Math.max(total - received, 0) / 100,
  } as const;
}
