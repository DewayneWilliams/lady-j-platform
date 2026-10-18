export const predefinedServiceCategories = [
  "Hair",
  "Nails",
  "Lashes",
  "Skin",
  "Makeup",
  "Brows",
  "Waxing",
  "Massage",
  "Specials",
  "Other",
];
export const productBrands = [
  "Design Essentials",
  "Joico",
  "Redken",
  "Keratin Complex",
  "Pure Brazilian",
];
export function serviceCategories(categories: string[]) {
  return [
    "All",
    ...predefinedServiceCategories,
    ...[...new Set(categories)].filter(
      (v) => v && !predefinedServiceCategories.includes(v) && v !== "All",
    ),
  ];
}
