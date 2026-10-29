import React, { useId } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Icon from "@/lib/icons/LucideIcon";
import { ButtonLabel, Txt, useColors } from "./ui";

export const BAG_CARD_ONLY_MESSAGE = "Shopping Bag purchases are payable by credit or debit card only.";
export const BAG_CARD_UNAVAILABLE_MESSAGE =
  "Card payments are not available yet. Your bag is saved and no payment has been taken.";

export function BagCardNotice() {
  const c = useColors();
  return <Txt size={12} color={c.mutedForeground}>{BAG_CARD_ONLY_MESSAGE}</Txt>;
}

export default function BagPaymentButton({
  onPress,
  disabled = false,
  arrow = false,
}: {
  onPress: () => void;
  disabled?: boolean;
  arrow?: boolean;
}) {
  const c = useColors();
  const gradientId = "bag-payment-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Make Payment"
      accessibilityHint={disabled ? BAG_CARD_UNAVAILABLE_MESSAGE : "Review your Shopping Bag card checkout"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c.bagPaymentGoldBase, borderColor: c.bagPaymentGoldEdge },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" accessible={false}>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={c.bagPaymentGoldBase} />
              <Stop offset="38%" stopColor={c.bagPaymentGoldHighlight} />
              <Stop offset="50%" stopColor={c.bagPaymentGoldHighlight} />
              <Stop offset="62%" stopColor={c.bagPaymentGoldBase} />
              <Stop offset="100%" stopColor={c.bagPaymentGoldEdge} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={"url(#" + gradientId + ")"} />
        </Svg>
      </View>
      {arrow && <Icon name="ArrowRight" size={22} color={c.bagPaymentGoldInk} />}
      <ButtonLabel size={20} color={c.bagPaymentGoldInk} style={styles.label}>
        Make Payment
      </ButtonLabel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    overflow: "hidden",
    borderWidth: 1,
  },
  pressed: { opacity: 0.86 },
  label: { textAlign: "center" },
});
