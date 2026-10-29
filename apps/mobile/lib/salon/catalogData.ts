import type { Product, Service } from "./types";

function catalogRows<T>(value: unknown, source: string, numericFields: string[]): T[] {
  if (!Array.isArray(value)) throw new Error(source + " returned an invalid response.");
  for (const row of value) {
    if (!row || typeof row !== "object" ||
      ["id", "name", "image"].some((field) => typeof row[field] !== "string" || !row[field].trim()) ||
      typeof row.description !== "string" || typeof row.category !== "string" ||
      numericFields.some((field) => typeof row[field] !== "number" || !Number.isFinite(row[field]) || row[field] < 0)) {
      throw new Error(source + " returned incomplete catalog information. Please retry.");
    }
  }
  return value as T[];
}

// Reject incomplete responses before replacing a valid catalog. Empty arrays remain
// valid: an owner can legitimately unpublish every item in a collection.
export function serviceRows(value: unknown): Service[] {
  return catalogRows<Service>(value, "Services", ["price", "duration"]);
}
export function productRows(value: unknown): Product[] {
  return catalogRows<Product>(value, "Products", ["price", "stock"]);
}
