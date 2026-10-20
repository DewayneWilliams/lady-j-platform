export const predefinedServiceCategories = [
  "Specials",
  "Hair",
  "Nails",
  "Lashes",
  "Brows",
  "Waxing",
  "Facials",
  "Skin Treatments",
  "Makeup",
  "Body Treatments",
  "Massage",
  "Foot Health",
  "Barbering",
];

/** Stable ordering keeps the saved order within each category. */
export function orderServicesByCategory<
  T extends { category: string; is_special?: boolean; catalog_sort_order?: number | null },
>(
  services: readonly T[],
): T[] {
  const rank = (service: T) => {
    const index = predefinedServiceCategories.indexOf(service.is_special ? "Specials" : service.category);
    return index < 0 ? predefinedServiceCategories.length : index;
  };
  return [...services].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.catalog_sort_order ?? Number.MAX_SAFE_INTEGER) -
        (b.catalog_sort_order ?? Number.MAX_SAFE_INTEGER),
  );
}
export const productBrands = [
  "Lady J",
  "Design Essentials",
  "Joico",
  "Redken",
  "Keratin Complex",
  "Pure Brazilian",
];
export function serviceCategories() {
  return ["All", ...predefinedServiceCategories];
}
