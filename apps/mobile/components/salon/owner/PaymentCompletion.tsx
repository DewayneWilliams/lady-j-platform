import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Appointment, Transaction, money } from "@/lib/salon/types";
import { appointmentPayment } from "@/lib/salon/appointmentPayment";
import { Card, ErrorBox, Txt, ButtonLabel, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
export default function PaymentCompletion({
  appointment,
  transactions,
  onConfirm,
}: {
  appointment: Appointment;
  transactions: Transaction[];
  demo: boolean;
  onConfirm: (method: "cash" | "bank", reference: string, amount: number) => Promise<void>;
}) {
  const c = useColors(),
    payment = appointmentPayment(appointment, transactions);
  const [method, setMethod] = useState<"cash" | "bank">("cash"),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setAccepted(false);
    setError("");
  }, [appointment.id, payment.remaining]);
  return (
    <View style={{ gap: 20 }}>
      <Card style={{ backgroundColor: c.goldSurface, borderColor: c.goldBorder, gap: 12 }}>
        <OwnerText>
          {appointment.services?.map((v) => v.name).join(" + ") || "Salon services"}
        </OwnerText>
        <OwnerText muted>Service total: {money(appointment.total)}</OwnerText>
        <OwnerText size={28} bold>
          {money(payment.remaining)} to record
        </OwnerText>
        <OwnerText muted>Previously verified receipts are already deducted.</OwnerText>
      </Card>
      <OwnerText bold>How was the balance received?</OwnerText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <OwnerButton
          label="Cash"
          secondary={method !== "cash"}
          onPress={() => {
            setMethod("cash");
            setAccepted(false);
          }}
        />
        <OwnerButton
          label="Bank Transfer"
          secondary={method !== "bank"}
          onPress={() => {
            setMethod("bank");
            setAccepted(false);
          }}
        />
      </View>
      <OwnerText muted>
        Record money already received. This action does not charge a card or transfer funds. Any
        unpaid deposit request will be closed.
      </OwnerText>
      <Pressable
        accessibilityRole="checkbox"
        aria-checked={accepted}
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted(!accepted)}
        style={{ minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: c.tertiary,
            backgroundColor: accepted ? c.tertiary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt bold color={c.tertiaryForeground}>
            {accepted ? "✓" : ""}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <ButtonLabel size={20} style={{ textAlign: "left" }}>
            I confirm {money(payment.remaining)} was received{" "}
            {method === "cash" ? "in cash" : "in the bank account"}.
          </ButtonLabel>
        </View>
      </Pressable>
      {!!error && <ErrorBox message={error} />}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <OwnerButton
          payment
          label={busy ? "Recording" : "Record Payment"}
          disabled={busy || !accepted || payment.remaining <= 0}
          onPress={() => {
            setBusy(true);
            setError("");
            void onConfirm(method, "", payment.remaining)
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Payment could not be recorded. Try again.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </View>
    </View>
  );
}
