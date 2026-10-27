import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import { royaltyLevel, royaltyLevels } from "@/lib/salon/loyalty";
import { dateLabel } from "@/lib/salon/types";
import { ErrorBox, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

type Data = {
  level: number;
  annual_visits: number;
  lifetime_visits: number;
  anniversary: string;
  history: { kind: string; title: string; detail: string; created_at: string }[];
};
const demoData: Data = {
  level: 3,
  annual_visits: 8,
  lifetime_visits: 19,
  anniversary: new Date(Date.now() + 86400000 * 90).toISOString(),
  history: [],
};

export default function OwnerClientLoyalty({
  clientId,
  demo = false,
}: {
  clientId: string;
  demo?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data>(
    demo
      ? demoData
      : {
          level: 1,
          annual_visits: 0,
          lifetime_visits: 0,
          anniversary: new Date().toISOString(),
          history: [],
        },
  );
  const [error, setError] = useState("");
  useEffect(() => {
    if (demo) return;
    let active = true;
    void Promise.resolve(db().rpc("lj_owner_client_rewards", { p_client: clientId }))
      .then(check)
      .then((value) => {
        if (active) setData(value as Data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load Royalty details.");
      });
    return () => {
      active = false;
    };
  }, [clientId, demo]);
  const level = royaltyLevel(data.level || 1);
  const next = royaltyLevels[data.level] || null;
  const remaining = next ? Math.max(0, next.visits - data.annual_visits) : 0;
  return (
    <View style={{ gap: 10 }}>
      <OwnerText size={24} bold>
        👑 Lady J Royalty Program
      </OwnerText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 68,
          padding: 14,
          borderRadius: 16,
          backgroundColor: c.goldSurface,
          borderWidth: 1,
          borderColor: c.goldBorder,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Icon name="Crown" size={25} color={c.tertiary} />
        <View style={{ flex: 1 }}>
          <OwnerText bold>
            {level.icon} {level.name}
          </OwnerText>
          <OwnerText size={15} muted>
            {data.annual_visits} annual visits · {data.lifetime_visits} lifetime visits
          </OwnerText>
        </View>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={20} color={c.foreground} />
      </Pressable>
      {!!error && <ErrorBox message={error} />}
      {open && (
        <View style={{ gap: 12, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <View
              style={{
                flex: 1,
                minWidth: 130,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <OwnerText size={14} muted>
                Next level
              </OwnerText>
              <OwnerText bold>
                {next
                  ? `${remaining} visit${remaining === 1 ? "" : "s"} to ${next.name}`
                  : "Royal Circle achieved"}
              </OwnerText>
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 130,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <OwnerText size={14} muted>
                Anniversary
              </OwnerText>
              <OwnerText bold>{dateLabel(data.anniversary)}</OwnerText>
            </View>
          </View>
          {data.history.length === 0 ? (
            <OwnerText muted>No Royalty activity yet.</OwnerText>
          ) : (
            data.history.map((entry, index) => (
              <View
                key={`${entry.kind}-${entry.created_at}-${index}`}
                style={{ borderBottomWidth: 1, borderColor: c.border, paddingBottom: 8 }}
              >
                <OwnerText>{entry.title}</OwnerText>
                <OwnerText size={14} muted>
                  {entry.detail} · {dateLabel(entry.created_at)}
                </OwnerText>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}
