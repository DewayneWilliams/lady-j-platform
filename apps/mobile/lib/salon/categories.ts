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
  T extends { category: string; name?: string; is_special?: boolean; catalog_sort_order?: number | null },
>(
  services: readonly T[],
): T[] {
  const rank = (service: T) => {
    const index = predefinedServiceCategories.indexOf(service.is_special ? "Specials" : service.category);
    return index < 0 ? predefinedServiceCategories.length : index;
  };
  return [...services].sort(
    (a, b) => {
      const washRank = (service: T) => {
        const match = /^Wash & Blow Dry — (Short|Medium|Long)$/i.exec(service.name || "");
        return match ? ["Short", "Medium", "Long"].indexOf(match[1]) : -1;
      };
      const aWash = washRank(a), bWash = washRank(b);
      return (
        rank(a) - rank(b) ||
        (aWash >= 0 && bWash >= 0 ? aWash - bWash : 0) ||
        (a.catalog_sort_order ?? Number.MAX_SAFE_INTEGER) -
          (b.catalog_sort_order ?? Number.MAX_SAFE_INTEGER)
      );
    },
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
