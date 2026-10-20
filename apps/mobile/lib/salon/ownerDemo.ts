import { Product, Workshop, Purchase, Transaction } from "./types";
/** Fictional commerce examples for the explicitly labeled owner demo only. */
export function createOwnerDemoCommerce(products: Product[], workshops: Workshop[]) {
  const created_at = new Date().toISOString();
  const first = products[0],
    second = products[1],
    workshop = workshops[0];
  const purchases: Purchase[] = [];
  if (first)
    purchases.push({
      id: "demo-order-1",
      customer_id: "demo-client-0",
      kind: "product",
      items: [{ id: first.id, name: first.name, price: Number(first.price), quantity: 1 }],
      total: Number(first.price),
      status: "paid",
      fulfillment: "pickup",
      created_at,
    });
  if (second)
    purchases.push({
      id: "demo-order-2",
      customer_id: "demo-client-1",
      kind: "product",
      items: [{ id: second.id, name: second.name, price: Number(second.price), quantity: 1 }],
      total: Number(second.price),
      status: "ready",
      fulfillment: "delivery",
      delivery_address: "Petit Valley",
      created_at,
    });
  if (workshop)
    purchases.push({
      id: "demo-enrollment-1",
      customer_id: "demo-client-2",
      kind: "workshop",
      items: [{ id: workshop.id, name: workshop.name, price: Number(workshop.price), quantity: 1 }],
      total: Number(workshop.price),
      status: "paid",
      fulfillment: "online",
      created_at,
    });
  const transactions: Transaction[] = purchases.map((p, i) => ({
    id: "demo-commerce-payment-" + i,
    customer_id: p.customer_id,
    appointment_id: null,
    purchase_id: p.id,
    amount: p.total,
    method: "bank",
    reference: "LJ-ORDER-" + (i + 1),
    status: "verified",
    received_at: created_at,
    created_at,
  }));
  return { purchases, transactions };
}
