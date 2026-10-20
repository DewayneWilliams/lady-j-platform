import React, { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { Appointment, Service, money, timeLabel } from "@/lib/salon/types";
import { nextClientPrep } from "@/lib/salon/ownerPrep";
import { Card, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
export default function TodayPreparation({
  today,
  services,
  nameFor,
}: {
  today: Appointment[];
  services: Service[];
  nameFor: (id: string | null) => string;
}) {
  const [now, setNow] = useState(() => new Date());
  const c = useColors();
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") tick();
    });
    return () => {
      clearInterval(timer);
      state.remove();
    };
  }, []);
  const plan = nextClientPrep(today, services, now);
  const projected = today
    .filter((item) => item.status !== "no_show")
    .reduce((sum, item) => sum + Number(item.total), 0);
  return (
    <Card style={{ gap: 18 }}>
      <OwnerText size={26} bold>
        Your day, at a glance
      </OwnerText>
      <OwnerText>
        {plan.remaining
          ? plan.remaining +
            (plan.remaining === 1 ? " visit remaining today." : " visits remaining today.")
          : "No more visits are scheduled later today."}
      </OwnerText>
      {plan.current && (
        <View style={{ gap: 6 }}>
          <OwnerText bold>Scheduled now</OwnerText>
          <OwnerText muted>
            {plan.current.services?.map((item) => item.name).join(" + ") || "Salon appointment"} ·{" "}
            {nameFor(plan.current.client_id || plan.current.customer_id)}
          </OwnerText>
        </View>
      )}
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 8 }}>
        <OwnerText muted>
          {today.length} appointments today{"\n"}
          {money(projected)} projected
        </OwnerText>
        <OwnerText size={16} muted>
          Updated {timeLabel(now.toISOString())} · Trinidad & Tobago
        </OwnerText>
      </View>
    </Card>
  );
}
