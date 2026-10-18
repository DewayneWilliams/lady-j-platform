import React from "react";
import { View } from "react-native";
import { ActivityColor } from "@/lib/salon/calendarActivity";
import { useColors } from "../ui";
export default function CalendarActivityDot({
  type,
  size = 7,
}: {
  type: ActivityColor;
  size?: number;
}) {
  const c = useColors();
  const colors = {
    confirmed: c.calendarConfirmed,
    blocked: c.calendarBlocked,
    vip: c.calendarVip,
    consultation: c.calendarConsultation,
    event: c.calendarEvent,
  };
  return (
    <View
      accessibilityLabel={type + " activity"}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[type],
        borderWidth: type === "blocked" ? 1 : 0,
        borderColor: c.calendarDotBorder,
        flexShrink: 0,
      }}
    />
  );
}
