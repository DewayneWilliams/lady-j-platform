import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Appointment, Transaction, money } from "@/lib/salon/types";
import { appointmentPayment } from "@/lib/salon/appointmentPayment";
import { check, db } from "@/lib/salon/client";
import { Card, ErrorBox, Field, Txt, ButtonLabel, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import GiftQrScanner from "./GiftQrScanner";
export default function PaymentCompletion({
  appointment,
  transactions,
  onConfirm,
  onGiftApplied,
}: {
  appointment: Appointment;
  transactions: Transaction[];
  demo: boolean;
  onConfirm: (method: "cash" | "bank", reference: string, amount: number) => Promise<void>;
  onGiftApplied: () => Promise<void>;
}) {
  const c = useColors(),
    payment = appointmentPayment(appointment, transactions);
  const [method, setMethod] = useState<"cash" | "bank">("cash"),
    [accepted, setAccepted] = useState(false),
    [giftCode, setGiftCode] = useState(""),
    [giftAmount, setGiftAmount] = useState(""),
    [scannerOpen, setScannerOpen] = useState(false),
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
      <Card style={{ gap: 12, borderColor: c.goldBorder, backgroundColor: c.goldSurface }}>
        <OwnerText size={22} bold>
          Apply Gift Card
        </OwnerText>
        <OwnerText muted>
          Enter the secure code from the card or QR. Partial and full gift payments are supported
          and audited.
        </OwnerText>
        <Field
          label="Gift Card Code"
          value={giftCode}
          onChangeText={(value) => setGiftCode(value.toUpperCase())}
          placeholder="LJ-XXXXXX-XXXXXX"
        />
        <OwnerButton label="Scan QR Code" secondary onPress={() => setScannerOpen(true)} />
        <Field
          label="Amount to Apply"
          value={giftAmount}
          onChangeText={setGiftAmount}
          keyboardType="decimal-pad"
          placeholder={String(payment.remaining)}
        />
        <OwnerButton
          label={busy ? "Applying…" : "Apply Gift Card"}
          secondary
          disabled={busy || !giftCode.trim() || !(Number(giftAmount) > 0)}
          onPress={() => {
            setBusy(true);
            setError("");
            void Promise.resolve(
              db().rpc("lj_owner_apply_gift_card", {
                p_appointment: appointment.id,
                p_code: giftCode.trim(),
                p_amount: Number(giftAmount),
              }),
            )
              .then(check)
              .then(onGiftApplied)
              .then(() => {
                setGiftCode("");
                setGiftAmount("");
              })
              .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Gift card could not be applied."),
              )
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      <GiftQrScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={(code) => {
          setGiftCode(code);
          if (!giftAmount) setGiftAmount(String(payment.remaining));
        }}
      />
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
            borderColor: c.brandAccent,
            backgroundColor: accepted ? c.brandAccentFill : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt bold color={c.primaryForeground}>
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
