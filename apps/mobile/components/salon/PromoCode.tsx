import React from "react";
import { View } from "react-native";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { money } from "@/lib/salon/types";
import { Action, Field, Txt, ErrorBox, LinkText, useColors } from "./ui";

export default function PromoCode({ pricing }: { pricing: ReturnType<typeof useDiscountQuote> }) {
  const c = useColors();
  return (
    <View style={{ gap: 10, marginVertical: 18 }}>
      <Field
        label="Have a Promo Code?"
        value={pricing.draftCode}
        onChangeText={(v) => pricing.setDraftCode(v.toUpperCase())}
        placeholder="Enter your code"
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Action
          label="Apply"
          secondary
          busy={pricing.busy}
          disabled={!pricing.draftCode.trim()}
          onPress={pricing.apply}
        />
        {!!(pricing.code || pricing.draftCode) && (
          <LinkText onPress={pricing.remove}>Remove code</LinkText>
        )}
      </View>
      {!!pricing.error && <ErrorBox message={pricing.error} retry={pricing.apply} />}
      {pricing.quote && Number(pricing.quote.discount_total) > 0 && (
        <Txt color={c.success} bold>
          {pricing.quote.code ? `${pricing.quote.code} · ` : "Automatic discount · "}You save{" "}
          {money(pricing.quote.discount_total)}
        </Txt>
      )}
      {pricing.quote?.code && Number(pricing.quote.discount_total) === 0 && (
        <Txt>Code accepted. Your selected items have no discountable balance.</Txt>
      )}
      {pricing.quote && (
        <Txt size={12} color={c.mutedForeground}>
          The best eligible percentage applies to each item. Offers do not combine.
        </Txt>
      )}
      {!pricing.ready && !pricing.busy && !pricing.error && !!pricing.draftCode.trim() && (
        <Txt size={13}>Apply or remove your code before continuing.</Txt>
      )}
      {pricing.busy && (
        <Txt size={13} color={c.mutedForeground}>
          Checking your price
        </Txt>
      )}
    </View>
  );
}
