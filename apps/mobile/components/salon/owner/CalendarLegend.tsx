import React from "react";
import { View } from "react-native";
import { activityLegend } from "@/lib/salon/calendarActivity";
import { Txt } from "../ui";
import CalendarActivityDot from "./CalendarActivityDot";
/** The same dot-and-label rhythm as the appointment payment legend. */
export default function CalendarLegend() {
  return (
    <View
      accessibilityLabel="Calendar color legend"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        columnGap: 14,
        rowGap: 10,
      }}
    >
      {activityLegend.map((item) => (
        <View
          key={item.key}
          accessibilityLabel={item.label}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <CalendarActivityDot type={item.key} size={8} />
          <Txt size={14}>{item.short}</Txt>
        </View>
      ))}
    </View>
  );
}
