import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { asRows, check, db } from "@/lib/salon/client";
import { royaltyLevel } from "@/lib/salon/loyalty";
import { ErrorBox, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

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
  total_qualifying_visits: number;
  levels: { level: number; clients: number }[];
  approaching: InsightClient[];
  dormant: InsightClient[];
};
const demoInsights: Insights = {
  total_enrolled: 18,
  total_qualifying_visits: 86,
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
};

export default function LoyaltySettings({
  demo,
  onMessageClient,
}: {
  demo: boolean;
  onMessageClient?: (client: InsightClient) => void;
}) {
  const c = useColors();
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<Insights>(
    demo
      ? demoInsights
      : {
          total_enrolled: 0,
          total_qualifying_visits: 0,
          levels: [],
          approaching: [],
          dormant: [],
        },
  );
  const load = useCallback(async () => {
    if (demo) return;
    const value = check(await db().rpc("lj_owner_royalty_insights"));
    if (!value || typeof value !== "object")
      throw new Error("Royalty insights returned an invalid response.");
    const result = value as Partial<Insights>;
    setInsights({
      total_enrolled: Number(result.total_enrolled) || 0,
      total_qualifying_visits: Number(result.total_qualifying_visits) || 0,
      levels: asRows<Insights["levels"][number]>(result.levels, "Royalty levels"),
      approaching: asRows<InsightClient>(result.approaching, "Approaching Royalty clients"),
      dormant: asRows<InsightClient>(result.dormant, "Dormant Royalty clients"),
    });
  }, [demo]);
  useEffect(() => {
    void load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Unable to load Royalty visits."),
    );
  }, [load]);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center", gap: 4, marginBottom: 4 }}>
        <OwnerText size={26} bold>
          Royalty Insights
        </OwnerText>
        <OwnerText size={15} muted>
          👑 Lady J Royalty Program · completed qualifying visits
        </OwnerText>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Enrolled", insights.total_enrolled],
          ["Completed visits", insights.total_qualifying_visits],
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
              {client.annual_visits || 0} completed visits · {client.visits_remaining} visit
              {client.visits_remaining === 1 ? "" : "s"} remaining
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
      {!!error && <ErrorBox message={error} />}
    </View>
  );
}
