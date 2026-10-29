import React, { useState } from "react";
import { View } from "react-native";
import { check, db } from "@/lib/salon/client";
import {
  rewardExpiration,
  rewardName,
  rewardValue,
  RewardSummary,
} from "@/lib/salon/loyalty";
import { Appointment, dateLabel, money } from "@/lib/salon/types";
import { Action, Card, ErrorBox, Txt, useColors } from "./ui";

export default function LoyaltyActions({
  rewards,
  appointments,
  onChanged,
}: {
  rewards: RewardSummary;
  appointments: Appointment[];
  onChanged: () => Promise<void>;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appointment = appointments
    .filter(
      (item) =>
        item.kind !== "block" &&
        ["pending", "confirmed"].includes(item.status) &&
        new Date(item.starts_at).getTime() >= Date.now(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  if (!rewards.enabled) return null;
  return (
    <View
      style={{
        marginBottom: 20,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.goldBorder,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Action
            label={open ? "Close Royalty Rewards" : "Use Royalty Rewards"}
            secondary
            onPress={() => setOpen(!open)}
          />
        </View>
      </View>
      {open && (
        <>
          <Txt bold>Redeem on your next appointment</Txt>
          {!appointment && (
            <Txt color={c.mutedForeground}>Book an appointment before applying a privilege.</Txt>
          )}
          {!rewards.entitlements.length && (
            <Txt color={c.mutedForeground}>
              Your next Royalty milestone is waiting to be unlocked.
            </Txt>
          )}
          {rewards.entitlements.map((item) => (
            <Card key={item.id} style={{ padding: 13, gap: 5, borderColor: c.goldBorder }}>
              <Txt bold>{rewardName(item)}</Txt>
              <Txt color={c.brandAccent} bold>
                {rewardValue(item)}
                {item.max_savings ? ` · Save up to ${money(item.max_savings)}` : ""}
              </Txt>
              <Txt size={12} color={c.mutedForeground}>
                {item.kind === "milestone"
                  ? "Eligible service charges only · VIP surcharges excluded"
                  : item.kind === "welcome"
                    ? "First eligible service appointment of TT$250 or more"
                    : "Eligible service appointment · Annual birthday benefit"}
              </Txt>
              <Txt size={12}>
                {item.status === "available"
                  ? item.expires_at
                    ? `Available · Expires ${dateLabel(rewardExpiration(item) || item.expires_at)}`
                    : "Available"
                  : item.status === "redeemed"
                    ? `Redeemed${item.redeemed_amount ? ` · You saved ${money(item.redeemed_amount)}` : ""}`
                    : "Expired"}
              </Txt>
              {item.status === "available" && (
                <Action
                  label={`Apply ${rewardValue(item)}`}
                  secondary
                  disabled={busy || !appointment}
                  onPress={() => {
                    if (!appointment) return;
                    setBusy(true);
                    setError("");
                    void Promise.resolve(
                      db().rpc("lj_redeem_privilege", {
                        p_entitlement: item.id,
                        p_appointment: appointment.id,
                      }),
                    )
                      .then(check)
                      .then(onChanged)
                      .catch((e: unknown) =>
                        setError(
                          e instanceof Error ? e.message : "Unable to apply this Royalty reward.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                />
              )}
            </Card>
          ))}
          {!!error && <ErrorBox message={error} />}
        </>
      )}
    </View>
  );
}
