import { Product, Workshop, Purchase, Transaction } from "./types";
import type { Service, Promotion } from "./types";
import type { Discount } from "./discounts";
import type { WaitlistEntry } from "./ownerAssistant";

export const ownerDemoDiscounts: Discount[] = [
  {
    id: "demo-discount-1",
    name: "Grace & Glow Welcome",
    code: "GRACE10",
    percentage: 10,
    scope: "all",
    item_id: null,
    active: true,
    expires_at: null,
    redemption_count: 12,
    total_discount: 460,
  },
  {
    id: "demo-discount-2",
    name: "Esther Beauty Day",
    code: "ESTHER15",
    percentage: 15,
    scope: "service",
    item_id: null,
    active: true,
    expires_at: null,
    redemption_count: 7,
    total_discount: 315,
  },
];

export const ownerDemoPromotions: Promotion[] = [
  {
    id: "demo-promotion-1",
    name: "Crown of Esther",
    description: "Demo promotion for a polished special-occasion beauty experience.",
    active: true,
  },
  {
    id: "demo-promotion-2",
    name: "Ruth & Naomi Self-Care",
    description: "Demo paired-care promotion for salon testing only.",
    active: true,
  },
];

export function createOwnerDemoWaitlist(services: Service[]): WaitlistEntry[] {
  const today = new Date();
  return Array.from({ length: 8 }, (_, index) => {
    const requested = new Date(today.getTime() + (index + 1) * 86400000);
    const service = services[index % Math.max(1, services.length)];
    return {
      id: `demo-waitlist-${index + 1}`,
      customer_id: `demo-client-${20 + index}`,
      requested_date: requested.toISOString().slice(0, 10),
      service_ids: service ? [service.id] : [],
      service_names: [service?.name || "Signature salon service"],
      duration: service?.duration || 60,
      status: "waiting",
      created_at: new Date(today.getTime() - index * 3600000).toISOString(),
      last_notified_at: index < 2 ? new Date().toISOString() : null,
    };
  });
}

/** Rich, removable commerce examples for the explicitly labeled owner demo only. */
export function createOwnerDemoCommerce(products: Product[], workshops: Workshop[]) {
  const now = Date.now();
  const productStatuses = ["pending", "paid", "processing", "ready", "fulfilled"] as const;
  const purchases: Purchase[] = products.slice(0, 10).map((product, index) => {
    const status = productStatuses[index % productStatuses.length];
    const created_at = new Date(now - index * 86400000).toISOString();
    const quantity = (index % 3) + 1;
    return {
      id: `demo-order-${index + 1}`,
      order_number: `DEMO-ORDER-${String(index + 1).padStart(4, "0")}`,
      customer_id: `demo-client-${index}`,
      kind: "product",
      items: [{ id: product.id, name: product.name, price: Number(product.price), quantity }],
      total: Number(product.price) * quantity,
      status,
      payment_status: status === "pending" ? "awaiting_verification" : "verified",
      fulfillment_status: status === "paid" ? "pending" : status,
      payment_method: "bank",
      contact_name: `Demo Client ${index + 1}`,
      contact_email: `bible.demo${index + 1}@demo.invalid`,
      contact_phone: `+1 868 555 ${String(2000 + index)}`,
      fulfillment: index % 2 ? "delivery" : "pickup",
      delivery_address: index % 2 ? `${index + 1} Demo Lane, Petit Valley` : "",
      created_at,
    };
  });

  workshops.slice(0, 5).forEach((workshop, index) => {
    const created_at = new Date(now - (index + 2) * 86400000).toISOString();
    purchases.push({
      id: `demo-enrollment-${index + 1}`,
      order_number: `DEMO-ACADEMY-${String(index + 1).padStart(3, "0")}`,
      customer_id: `demo-client-${10 + index}`,
      kind: "workshop",
      items: [{ id: workshop.id, name: workshop.name, price: Number(workshop.price), quantity: 1 }],
      total: Number(workshop.price),
      status: index === 0 ? "pending" : "paid",
      payment_status: index === 0 ? "awaiting_verification" : "verified",
      fulfillment_status: "pending",
      payment_method: "bank",
      fulfillment: "online",
      created_at,
    });
  });

  const transactions: Transaction[] = purchases.map((purchase, index) => {
    const pending = purchase.payment_status === "awaiting_verification";
    return {
      id: `demo-commerce-payment-${index}`,
      customer_id: purchase.customer_id,
      appointment_id: null,
      purchase_id: purchase.id,
      amount: purchase.total,
      method: "bank",
      reference: `DEMO-BANK-${String(index + 1).padStart(4, "0")}`,
      status: pending ? "pending" : "verified",
      received_at: pending ? null : purchase.created_at,
      created_at: purchase.created_at,
    };
  });
  return { purchases, transactions };
}
