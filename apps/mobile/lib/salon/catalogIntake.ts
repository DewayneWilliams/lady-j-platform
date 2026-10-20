import { predefinedServiceCategories } from "./categories";

export type CatalogIntakeEntry = {
  source_key: string;
  category: string;
  sort_order: number;
  name: string;
  description: string;
  duration_label: string;
  duration_minutes: number | null;
  price_label: string;
  price_amount: number | null;
  price_kind: "fixed" | "from" | "per_item" | null;
  price_unit: "nail" | "toe" | "couple" | null;
  is_add_on: boolean;
  compatible_service_keys: string[] | null;
  image: string | null;
  image_license: { source_url: string; license_url: string; author: string } | null;
  status: "draft";
};

export function catalogIntakeEntries(rows: { source_entry: unknown }[]): CatalogIntakeEntry[] {
  const entries = rows.map(({ source_entry }) => {
    if (!source_entry || typeof source_entry !== "object")
      throw new Error("A catalog draft could not be read.");
    const entry = source_entry as Partial<CatalogIntakeEntry>;
    if (
      typeof entry.source_key !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.description !== "string" ||
      typeof entry.category !== "string" ||
      !predefinedServiceCategories.includes(entry.category) ||
      !Number.isInteger(entry.sort_order) ||
      typeof entry.duration_label !== "string" ||
      typeof entry.price_label !== "string" ||
      typeof entry.is_add_on !== "boolean" ||
      entry.status !== "draft"
    )
      throw new Error("A catalog draft is incomplete. Please refresh and try again.");
    return entry as CatalogIntakeEntry;
  });
  return entries.sort(
    (a, b) =>
      predefinedServiceCategories.indexOf(a.category) -
        predefinedServiceCategories.indexOf(b.category) ||
      Number(a.is_add_on) - Number(b.is_add_on) ||
      a.sort_order - b.sort_order,
  );
}
