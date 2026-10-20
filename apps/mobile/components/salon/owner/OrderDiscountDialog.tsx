import React, { useState } from "react";
import { View, Modal, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Appointment, Purchase, money } from "@/lib/salon/types";
import { Field, ButtonLabel, ErrorBox, useColors } from "../ui";
import { OwnerText, OwnerButton } from "./OwnerUI";

export type DiscountTarget =
  | { kind: "appointment"; record: Appointment }
  | { kind: "purchase"; record: Purchase };
export default function OrderDiscountDialog({
  target,
  receivedAmount = 0,
  onClose,
  onSave,
}: {
  target: DiscountTarget;
  demo: boolean;
  receivedAmount?: number;
  onClose: () => void;
  onSave: (percentage: number) => Promise<void>;
}) {
  const c = useColors();
  const [percentage, setPercentage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pct = Number(percentage);
  const valid =
    /^\d{1,3}(?:\.\d{1,2})?$/.test(percentage.trim()) &&
    Number.isFinite(pct) &&
    pct >= 0 &&
    pct <= 100;
  const items =
    target.kind === "appointment"
      ? target.record.services.map((v) => ({ ...v, quantity: 1 }))
      : target.record.items;
  const fee =
    target.kind === "purchase"
      ? Number(
          target.record.delivery_fee ??
            Math.max(
              0,
              target.record.total - items.reduce((sum, v) => sum + Number(v.price) * v.quantity, 0),
            ),
        )
      : 0;
  const nextTotal =
    items.reduce(
      (sum, v) =>
        sum +
        (Math.round(Number(v.original_price ?? v.price) * (1 - pct / 100) * 100) / 100) *
          v.quantity,
      0,
    ) + fee;
  async function save() {
    if (!valid || nextTotal < receivedAmount || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(pct);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to apply this discount.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => {
        if (!busy) {
          if (confirming) setConfirming(false);
          else onClose();
        }
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <SafeAreaView
          edges={{ top: "additive", left: "additive", right: "additive", bottom: "additive" }}
          style={{
            maxWidth: 600,
            maxHeight: "90%",
            width: "100%",
            alignSelf: "center",
            backgroundColor: c.card,
            borderRadius: 20,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <OwnerText size={27} bold>
              {target.kind === "appointment"
                ? "Custom Appointment Discount"
                : "Apply Discount to Total"}
            </OwnerText>

            <OwnerText>{items.map((v) => v.name).join(", ")}</OwnerText>
            <OwnerText>
              Choose your percentage for the combined service, product or workshop subtotal.
              Delivery is excluded. Recorded receipts stay unchanged.
            </OwnerText>
            <View
              testID="discount-presets"
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "stretch",
                gap: 4,
                width: "100%",
              }}
            >
              {[5, 10, 15, 20, 25].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={value + "%"}
                  accessibilityState={{ selected: percentage !== "" && pct === value }}
                  disabled={busy || confirming}
                  onPress={() => setPercentage(String(value))}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 48,
                    paddingVertical: 12,
                    paddingHorizontal: 2,
                    borderWidth: 1,
                    borderColor: pct === value ? c.brandAccent : c.border,
                    backgroundColor: pct === value ? c.brandAccentSurface : c.card,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ButtonLabel size={14}>{value}%</ButtonLabel>
                </Pressable>
              ))}
            </View>
            <OwnerText muted>
              This replaces the current discount. Enter 0 to restore the original item prices. The
              new total cannot be lower than money already received.
            </OwnerText>
            <Field
              large
              label="Discount percentage"
              value={percentage}
              onChangeText={setPercentage}
              keyboardType="decimal-pad"
              placeholder="0–100"
            />
            {!!percentage.trim() && !valid && (
              <ErrorBox message="Enter a percentage from 0 to 100, with up to two decimal places." />
            )}
            {!!error && <ErrorBox message={error} />}
            <OwnerText>Current total: {money(target.record.total)}</OwnerText>
            {valid && <OwnerText bold>New total: {money(nextTotal)}</OwnerText>}
            {target.kind === "appointment" && receivedAmount > 0 && (
              <OwnerText>Already received: {money(receivedAmount)}</OwnerText>
            )}
            {valid &&
              target.kind === "appointment" &&
              receivedAmount > 0 &&
              nextTotal >= receivedAmount && (
                <OwnerText bold>New balance due: {money(nextTotal - receivedAmount)}</OwnerText>
              )}
            {valid && nextTotal < receivedAmount && (
              <ErrorBox message="This discount would reduce the total below money already received. A separate refund review is required." />
            )}
            {valid && target.kind === "appointment" && receivedAmount === 0 && (
              <OwnerText>50% deposit: {money(Math.round(nextTotal * 50) / 100)}</OwnerText>
            )}
            {confirming ? (
              <View
                accessibilityRole="alert"
                style={{
                  gap: 16,
                  borderWidth: 1,
                  borderColor: c.goldBorder,
                  backgroundColor: c.goldSurface,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <OwnerText bold>Are you sure you want to apply this discount?</OwnerText>
                <OwnerText>
                  {pct}% off · New total: {money(nextTotal)}
                </OwnerText>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <OwnerButton
                      fill
                      label="Cancel"
                      secondary
                      disabled={busy}
                      onPress={() => setConfirming(false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <OwnerButton fill label="Confirm" busy={busy} onPress={() => void save()} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <OwnerButton
                  label={busy ? "Applying" : "Apply Discount"}
                  disabled={!valid || nextTotal < receivedAmount || busy}
                  onPress={() => {
                    if (pct > 25) setConfirming(true);
                    else void save();
                  }}
                />
                <OwnerButton label="Cancel" secondary disabled={busy} onPress={onClose} />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
