import React, { useState } from "react";
import { View } from "react-native";
import { check, db } from "@/lib/salon/client";
import { RewardSummary, rewardMilestones } from "@/lib/salon/loyalty";
import { Appointment, money } from "@/lib/salon/types";
import { Action, ErrorBox, Field, Txt, useColors } from "./ui";

export default function LoyaltyActions({ rewards, appointments, onChanged }: { rewards: RewardSummary; appointments: Appointment[]; onChanged: () => Promise<void> }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [referral, setReferral] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appointment = appointments.filter((item) => item.kind !== "block" && ["pending", "confirmed"].includes(item.status) && new Date(item.starts_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  if (!rewards.enabled) return null;
  return <View style={{ marginBottom: 20, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.goldBorder, gap: 12 }}>
    <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Action label={open ? "Close Rewards" : "Use Rewards"} secondary onPress={() => setOpen(!open)} /></View></View>
    {open && <>
      <Txt bold>Your referral code</Txt><Txt selectable color={c.mutedForeground}>{rewards.referral_code || "Available after your account refreshes"}</Txt>
      <Field label="Friend's Referral Code" value={referral} onChangeText={setReferral} />
      <Action label="Apply Referral Code" secondary disabled={busy || !referral.trim()} onPress={() => { setBusy(true); setError(""); void Promise.resolve(db().rpc("lj_register_referral", { p_code: referral.trim() })).then(check).then(() => { setReferral(""); return onChanged(); }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to apply the referral code.")).finally(() => setBusy(false)); }} />
      <Txt bold>Redeem on your next appointment</Txt>
      {!appointment && <Txt color={c.mutedForeground}>Book an appointment before redeeming points.</Txt>}
      {rewards.entitlements.filter((item) => item.status === "available").map((item) => <Action key={item.id} label={`${item.kind === "welcome" ? "Welcome Gift" : "Birthday Privilege"} · ${money(item.amount)} off`} secondary disabled={busy || !appointment} onPress={() => { if (!appointment) return; setBusy(true); setError(""); void Promise.resolve(db().rpc("lj_redeem_privilege", { p_entitlement: item.id, p_appointment: appointment.id })).then(check).then(onChanged).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to apply this privilege.")).finally(() => setBusy(false)); }} />)}
      {rewardMilestones.filter((item) => rewards.points >= item.points).map((item) => <Action key={item.points} label={`${item.name} · ${item.points.toLocaleString("en-TT")} points for ${money(item.value)}`} secondary disabled={busy || !appointment} onPress={() => { if (!appointment) return; setBusy(true); setError(""); void Promise.resolve(db().rpc("lj_redeem_rewards", { p_appointment: appointment.id, p_points: item.points })).then(check).then(onChanged).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to redeem this reward.")).finally(() => setBusy(false)); }} />)}
      {!!error && <ErrorBox message={error} />}
    </>}
  </View>;
}
