import { useEffect, useState } from "react";
import { db, check } from "./client";
import { useSalon } from "./SalonProvider";

export type Discount = {
  id: string;
  name: string;
  code: string | null;
  percentage: number;
  scope: "all" | "service" | "product" | "workshop";
  item_id: string | null;
  active: boolean;
  expires_at: string | null;
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
  const enabled = !!s.session && s.authReady && !s.loading && items.length > 0;
  const key = JSON.stringify([s.session?.user?.id, kind, itemsJson, code]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setResult(null);
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
  }, [enabled, key, kind, itemsJson, code, retry]);
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
