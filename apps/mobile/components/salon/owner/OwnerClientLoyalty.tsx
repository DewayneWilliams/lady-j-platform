import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import { dateLabel } from "@/lib/salon/types";
import { ErrorBox, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

type Data = { points: number; history: { id: string; points: number; reason: string; created_at: string }[] };
export default function OwnerClientLoyalty({ clientId, demo = false, visits }: { clientId: string; demo?: boolean; visits: number }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data>(demo ? { points: 1240, history: [] } : { points: 0, history: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    if (demo) return;
    let active = true;
    void Promise.resolve(db().rpc("lj_owner_client_rewards", { p_client: clientId })).then(check).then((value) => { if (active) setData(value as Data); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Unable to load rewards."); });
    return () => { active = false; };
  }, [clientId, demo]);
  return (
    <View style={{ gap: 10 }}>
      <OwnerText size={24} bold>Loyalty Program</OwnerText>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 58, padding: 14, borderRadius: 16, backgroundColor: c.goldSurface, borderWidth: 1, borderColor: c.goldBorder, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name="Crown" size={23} color={c.tertiary} />
        <View style={{ flex: 1 }}><OwnerText bold>{Number(data.points).toLocaleString("en-TT")} Points</OwnerText><OwnerText size={15} muted>{visits} total visit{visits === 1 ? "" : "s"} · {Math.floor(data.points / 500)} rewards available</OwnerText></View>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={20} color={c.foreground} />
      </Pressable>
      {!!error && <ErrorBox message={error} />}
      {open && <View style={{ gap: 10, paddingHorizontal: 4 }}>
        {data.history.length === 0 ? <OwnerText muted>No reward activity yet.</OwnerText> : data.history.map((entry) => <View key={entry.id} style={{ borderBottomWidth: 1, borderColor: c.border, paddingBottom: 8 }}><OwnerText>{entry.reason}</OwnerText><OwnerText size={14} muted>{entry.points > 0 ? "+" : ""}{entry.points} points · {dateLabel(entry.created_at)}</OwnerText></View>)}
      </View>}
    </View>
  );
}
