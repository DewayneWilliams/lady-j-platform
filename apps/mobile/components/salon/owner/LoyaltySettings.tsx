import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { check, db } from "@/lib/salon/client";
import { money } from "@/lib/salon/types";
import { royaltyLevel } from "@/lib/salon/loyalty";
import { ErrorBox, Field, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

type Balance = {
  customer_id: string;
  points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  full_name: string;
};
type Entry = {
  id: string;
  customer_id: string;
  points: number;
  reason: string;
  created_at: string;
};
type InsightClient = {
  customer_id: string;
  full_name: string;
  current_level?: number;
  annual_visits?: number;
  visits_remaining?: number;
  last_visit?: string | null;
  phone?: string;
  whatsapp_phone?: string;
};
type Insights = {
  total_enrolled: number;
  levels: { level: number; clients: number }[];
  approaching: InsightClient[];
  dormant: InsightClient[];
  points: { issued: number; redeemed: number; outstanding: number };
};
const demoInsights: Insights = {
  total_enrolled: 18,
  levels: [5, 4, 3, 2, 2, 1, 1].map((clients, index) => ({ level: index + 1, clients })),
  approaching: [
    {
      customer_id: "demo",
      full_name: "Test Client",
      current_level: 3,
      annual_visits: 8,
      visits_remaining: 2,
      phone: "8685550100",
    },
  ],
  dormant: [],
  points: { issued: 1640, redeemed: 400, outstanding: 1240 },
};

export default function LoyaltySettings({
  demo,
  redemptionPoints,
  redemptionValue,
  onMessageClient,
}: {
  demo: boolean;
  redemptionPoints: number;
  redemptionValue: number;
  onMessageClient?: (client: InsightClient) => void;
}) {
  const c = useColors();
  const [balances, setBalances] = useState<Balance[]>(
    demo
      ? [
          {
            customer_id: "demo",
            points: 1240,
            lifetime_earned: 1640,
            lifetime_redeemed: 400,
            full_name: "Test Client",
          },
        ]
      : [],
  );
  const [history, setHistory] = useState<Entry[]>([]);
  const [selected, setSelected] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<Insights>(
    demo
      ? demoInsights
      : {
          total_enrolled: 0,
          levels: [],
          approaching: [],
          dormant: [],
          points: { issued: 0, redeemed: 0, outstanding: 0 },
        },
  );
  const load = useCallback(async () => {
    if (demo) return;
    const [balanceRows, clients, ledger, insightResult] = await Promise.all([
      db().from("lj_reward_balances").select("*").order("points", { ascending: false }),
      db().from("lj_client_records").select("customer_id,full_name").is("deleted_at", null),
      db()
        .from("lj_reward_ledger")
        .select("id,customer_id,points,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      db().rpc("lj_owner_royalty_insights"),
    ]);
    const names = new Map(
      (check(clients) as { customer_id: string; full_name: string }[]).map((row) => [
        row.customer_id,
        row.full_name,
      ]),
    );
    setBalances(
      (check(balanceRows) as Omit<Balance, "full_name">[]).map((row) => ({
        ...row,
        full_name: names.get(row.customer_id) || "Client",
      })),
    );
    setHistory(check(ledger) as Entry[]);
    setInsights(check(insightResult) as Insights);
  }, [demo]);
  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Unable to load reward balances."),
    );
  }, [load]);
  const liability = useMemo(
    () =>
      balances.reduce(
        (sum, row) => sum + (Number(row.points) / Math.max(1, redemptionPoints)) * redemptionValue,
        0,
      ),
    [balances, redemptionPoints, redemptionValue],
  );
  const selectedHistory = selected
    ? history.filter((entry) => entry.customer_id === selected).slice(0, 8)
    : [];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center", gap: 4, marginBottom: 4 }}>
        <OwnerText size={26} bold>
          Royalty Insights
        </OwnerText>
        <OwnerText size={15} muted>
          👑 Lady J Royalty Program · visit progress and rewards
        </OwnerText>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Enrolled", insights.total_enrolled],
          ["Points issued", Number(insights.points.issued).toLocaleString("en-TT")],
          ["Redeemed", Number(insights.points.redeemed).toLocaleString("en-TT")],
          ["Outstanding", Number(insights.points.outstanding).toLocaleString("en-TT")],
        ].map(([label, value]) => (
          <View
            key={String(label)}
            style={{
              flex: 1,
              minWidth: 135,
              padding: 14,
              borderRadius: 14,
              backgroundColor: c.goldSurface,
              borderWidth: 1,
              borderColor: c.goldBorder,
            }}
          >
            <OwnerText size={14} muted>
              {label}
            </OwnerText>
            <OwnerText size={24} bold>
              {value}
            </OwnerText>
          </View>
        ))}
      </View>
      <OwnerText bold>Clients by Royalty Level</OwnerText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {insights.levels.map((row) => {
          const level = royaltyLevel(row.level);
          return (
            <View
              key={row.level}
              style={{
                minWidth: 112,
                flexGrow: 1,
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <OwnerText size={15} bold>
                {level.icon} {level.name}
              </OwnerText>
              <OwnerText size={14} muted>
                {row.clients} client{row.clients === 1 ? "" : "s"}
              </OwnerText>
            </View>
          );
        })}
      </View>
      <OwnerText bold>Approaching Their Next Level</OwnerText>
      {insights.approaching.length === 0 ? (
        <OwnerText muted>No clients are within two visits of their next level.</OwnerText>
      ) : (
        insights.approaching.map((client) => (
          <View
            key={client.customer_id}
            style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border, gap: 7 }}
          >
            <OwnerText bold>{client.full_name}</OwnerText>
            <OwnerText size={14} muted>
              {client.visits_remaining} visit{client.visits_remaining === 1 ? "" : "s"} remaining
            </OwnerText>
            {onMessageClient && (
              <OwnerButton
                label="Message Client"
                secondary
                onPress={() => onMessageClient(client)}
              />
            )}
          </View>
        ))
      )}
      <OwnerText bold>Haven’t Returned Recently</OwnerText>
      {insights.dormant.length === 0 ? (
        <OwnerText muted>No clients currently need a return-visit follow-up.</OwnerText>
      ) : (
        insights.dormant.slice(0, 12).map((client) => (
          <View
            key={client.customer_id}
            style={{ paddingVertical: 9, borderBottomWidth: 1, borderColor: c.border, gap: 6 }}
          >
            <OwnerText bold>{client.full_name}</OwnerText>
            <OwnerText size={14} muted>
              {client.last_visit
                ? `Last qualifying visit ${client.last_visit}`
                : "No qualifying visit yet"}
            </OwnerText>
            {onMessageClient && (
              <OwnerButton
                label="Message Client"
                secondary
                onPress={() => onMessageClient(client)}
              />
            )}
          </View>
        ))
      )}
      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: c.goldSurface,
          borderWidth: 1,
          borderColor: c.goldBorder,
        }}
      >
        <OwnerText bold>Outstanding Royalty Reward Value</OwnerText>
        <OwnerText size={26} bold>
          {money(liability)}
        </OwnerText>
        <OwnerText size={15} muted>
          Current point balances at today’s redemption rate.
        </OwnerText>
      </View>
      <OwnerText bold>Client Royalty Balances &amp; Reward History</OwnerText>
      {balances.length === 0 ? (
        <OwnerText muted>No reward activity yet.</OwnerText>
      ) : (
        balances.map((row) => (
          <Pressable
            key={row.customer_id}
            accessibilityRole="button"
            onPress={() => setSelected(selected === row.customer_id ? "" : row.customer_id)}
            style={{
              minHeight: 52,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderColor: c.border,
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <OwnerText bold>{row.full_name}</OwnerText>
              <OwnerText size={14} muted>
                {Number(row.lifetime_earned).toLocaleString("en-TT")} lifetime points
              </OwnerText>
            </View>
            <OwnerText bold>{Number(row.points).toLocaleString("en-TT")} pts</OwnerText>
          </Pressable>
        ))
      )}
      {selectedHistory.map((entry) => (
        <View
          key={entry.id}
          style={{ paddingLeft: 12, borderLeftWidth: 2, borderColor: c.goldBorder }}
        >
          <OwnerText size={15}>{entry.reason}</OwnerText>
          <OwnerText size={14} muted>
            {entry.points > 0 ? "+" : ""}
            {entry.points} points
          </OwnerText>
        </View>
      ))}
      <OwnerText bold>Manual Adjustment</OwnerText>
      <OwnerText size={15} muted>
        Use a negative number to remove points. Balances can never fall below zero.
      </OwnerText>
      <Field label="Points" value={points} keyboardType="decimal-pad" onChangeText={setPoints} />
      <Field label="Required Reason" value={reason} onChangeText={setReason} />
      {!!error && <ErrorBox message={error} />}
      <OwnerButton
        label={busy ? "Saving Adjustment" : "Save Adjustment"}
        disabled={busy || !selected || !points.trim() || reason.trim().length < 5}
        onPress={() => {
          if (demo) {
            setError("Choose a live client to save a reward adjustment.");
            return;
          }
          setBusy(true);
          setError("");
          void Promise.resolve(
            db().rpc("lj_owner_adjust_rewards", {
              p_customer: selected,
              p_points: Number(points),
              p_reason: reason.trim(),
            }),
          )
            .then(check)
            .then(() => {
              setPoints("");
              setReason("");
              return load();
            })
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Unable to adjust points."),
            )
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}
