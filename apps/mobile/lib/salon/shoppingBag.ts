export type ShoppingBag = {
  products: Record<string, number>;
  services: string[];
  workshops: string[];
};
const ids = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((id): id is string => typeof id === "string" && Boolean(id.trim())))]
  : [];

export function readShoppingBag(raw: string): ShoppingBag {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== "object" || Array.isArray(saved))
    throw new Error("Invalid saved shopping bag.");
  const bag = saved as Record<string, unknown>;
  return {
    products: bag.products && typeof bag.products === "object" && !Array.isArray(bag.products)
      ? Object.fromEntries(Object.entries(bag.products).filter(
          ([id, quantity]) => Boolean(id.trim()) && typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0,
        )) : {},
    services: ids(bag.services).slice(0, 10),
    workshops: ids(bag.workshops),
  };
}

export function restoreBagIds(saved: string[], current: string[]): string[] {
  return [...new Set([...saved, ...current])];
}

export function addRequestedService(current: string[], id: string): string[] {
  return current.includes(id) ? current : [...current, id];
}
