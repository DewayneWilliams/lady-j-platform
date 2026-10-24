import { useEffect, useState } from "react";
import { db, check } from "./client";
import { useSalon } from "./SalonProvider";

export type Discount = {
  id: string;
  name: string;
  code: string | null;
  percentage: number;
  discount_type?: "percentage" | "fixed";
  fixed_amount?: number | null;
  scope: "all" | "service" | "product" | "workshop";
  item_id: string | null;
  active: boolean;
  expires_at: string | null;
  starts_at?: string | null;
  timezone?: string;
  redemption_count?: number;
  total_discount?: number;
};
export type DiscountItem = { id: string; quantity: number };
export type DiscountQuote = {
  items: {
    id: string;
    name: string;
    price: number;
    original_price: number;
    quantity: number;
    discount_percentage: number;
  }[];
  subtotal: number;
  original_subtotal: number;
  discount_total: number;
  code: string | null;
};

export function useDiscountQuote(kind: "service" | "product" | "workshop", items: DiscountItem[]) {
  const s = useSalon();
  const [draftCode, setDraftCode] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    key: string;
    quote?: DiscountQuote;
    error?: string;
  } | null>(null);
  const itemsJson = JSON.stringify(items);
  const enabled = s.authReady && !s.loading && items.length > 0;
  const key = JSON.stringify([s.session?.user?.id, kind, itemsJson, code]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setResult(null);
    if (s.testMode) {
      const catalog =
        kind === "service" ? s.services : kind === "product" ? s.products : s.workshops;
      const quotedItems = (JSON.parse(itemsJson) as DiscountItem[]).flatMap((item) => {
        const match = catalog.find((entry) => entry.id === item.id);
        if (!match) return [];
        const price = Number(match.price);
        return [
          {
            id: item.id,
            name: match.name,
            price,
            original_price: price,
            quantity: item.quantity,
            discount_percentage: 0,
          },
        ];
      });
      const subtotal = quotedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setResult({
        key,
        quote: {
          items: quotedItems,
          subtotal,
          original_subtotal: subtotal,
          discount_total: 0,
          code: code || null,
        },
      });
      return;
    }
    void (async () => {
      try {
        const quote = check(
          await db().rpc("lj_quote_discount", {
            p_kind: kind,
            p_items: JSON.parse(itemsJson),
            p_code: code,
          }),
        ) as DiscountQuote;
        if (active) setResult({ key, quote });
      } catch (e) {
        if (active)
          setResult({
            key,
            error:
              e instanceof Error ? e.message : "Unable to check your discount. Please try again.",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, key, kind, itemsJson, code, retry, s.testMode, s.services, s.products, s.workshops]);
  const current = enabled && result?.key === key ? result : null;
  const quote = current?.quote;
  return {
    quote,
    code,
    draftCode,
    setDraftCode,
    error: current?.error || "",
    busy: enabled && !current,
    ready: !!quote && draftCode.trim().toUpperCase() === code,
    apply: () => {
      setCode(draftCode.trim().toUpperCase());
      setRetry((v) => v + 1);
    },
    remove: () => {
      setCode("");
      setDraftCode("");
      setRetry((v) => v + 1);
    },
  };
}
