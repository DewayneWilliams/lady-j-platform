import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { check, db } from "@/lib/salon/client";
import { money } from "@/lib/salon/types";
import { ErrorBox, Field, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

type Balance = { customer_id: string; points: number; lifetime_earned: number; lifetime_redeemed: number; full_name: string };
type Entry = { id: string; customer_id: string; points: number; reason: string; created_at: string };

export default function LoyaltySettings({ demo, redemptionPoints, redemptionValue }: { demo: boolean; redemptionPoints: number; redemptionValue: number }) {
  const c = useColors();
  const [balances, setBalances] = useState<Balance[]>(demo ? [{ customer_id: "demo", points: 1240, lifetime_earned: 1640, lifetime_redeemed: 400, full_name: "Test Client" }] : []);
  const [history, setHistory] = useState<Entry[]>([]);
  const [selected, setSelected] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (demo) return;
    const [balanceRows, clients, ledger] = await Promise.all([
      db().from("lj_reward_balances").select("*").order("points", { ascending: false }),
      db().from("lj_client_records").select("customer_id,full_name").is("deleted_at", null),
      db().from("lj_reward_ledger").select("id,customer_id,points,reason,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    const names = new Map((check(clients) as { customer_id: string; full_name: string }[]).map((row) => [row.customer_id, row.full_name]));
    setBalances((check(balanceRows) as Omit<Balance, "full_name">[]).map((row) => ({ ...row, full_name: names.get(row.customer_id) || "Client" })));
    setHistory(check(ledger) as Entry[]);
  }, [demo]);
  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load reward balances.")); }, [load]);
  const liability = useMemo(() => balances.reduce((sum, row) => sum + Number(row.points) / Math.max(1, redemptionPoints) * redemptionValue, 0), [balances, redemptionPoints, redemptionValue]);
  const selectedHistory = selected ? history.filter((entry) => entry.customer_id === selected).slice(0, 8) : [];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ padding: 14, borderRadius: 14, backgroundColor: c.goldSurface, borderWidth: 1, borderColor: c.goldBorder }}>
        <OwnerText bold>Outstanding Reward Liability</OwnerText>
        <OwnerText size={26} bold>{money(liability)}</OwnerText>
        <OwnerText size={15} muted>Current point balances at today’s redemption rate.</OwnerText>
      </View>
      <OwnerText bold>Client Balances & Reward History</OwnerText>
      {balances.length === 0 ? <OwnerText muted>No reward activity yet.</OwnerText> : balances.map((row) => (
        <Pressable key={row.customer_id} accessibilityRole="button" onPress={() => setSelected(selected === row.customer_id ? "" : row.customer_id)} style={{ minHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}><OwnerText bold>{row.full_name}</OwnerText><OwnerText size={14} muted>{Number(row.lifetime_earned).toLocaleString("en-TT")} lifetime points</OwnerText></View>
          <OwnerText bold>{Number(row.points).toLocaleString("en-TT")} pts</OwnerText>
        </Pressable>
      ))}
      {selectedHistory.map((entry) => <View key={entry.id} style={{ paddingLeft: 12, borderLeftWidth: 2, borderColor: c.goldBorder }}><OwnerText size={15}>{entry.reason}</OwnerText><OwnerText size={14} muted>{entry.points > 0 ? "+" : ""}{entry.points} points</OwnerText></View>)}
      <OwnerText bold>Manual Adjustment</OwnerText>
      <OwnerText size={15} muted>Use a negative number to remove points. Balances can never fall below zero.</OwnerText>
      <Field label="Points" value={points} keyboardType="decimal-pad" onChangeText={setPoints} />
      <Field label="Required Reason" value={reason} onChangeText={setReason} />
      {!!error && <ErrorBox message={error} />}
      <OwnerButton label={busy ? "Saving Adjustment" : "Save Adjustment"} disabled={busy || !selected || !points.trim() || reason.trim().length < 5} onPress={() => {
        if (demo) { setError("Choose a live client to save a reward adjustment."); return; }
        setBusy(true); setError("");
        void Promise.resolve(db().rpc("lj_owner_adjust_rewards", { p_customer: selected, p_points: Number(points), p_reason: reason.trim() })).then(check).then(() => { setPoints(""); setReason(""); return load(); }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to adjust points.")).finally(() => setBusy(false));
      }} />
    </View>
  );
}
