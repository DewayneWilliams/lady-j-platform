import { salonDayKey } from "@/lib/salon/ownerToday";
import React from "react";
import { View, Pressable } from "react-native";
import { Appointment, dateLabel, timeLabel } from "@/lib/salon/types";
import { blockReasonLabel, activityColor } from "@/lib/salon/calendarActivity";
import { appointmentDuration } from "@/lib/salon/ownerPrep";
import { Card, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
import CalendarActivityDot from "./CalendarActivityDot";
export default function BlockActivityCard({
  block,
  onEdit,
}: {
  block: Appointment;
  onEdit: () => void;
}) {
  const c = useColors();
  const displayEnd = block.all_day
    ? new Date(Date.parse(block.ends_at) - 1).toISOString()
    : block.ends_at;
  const spansDays = salonDayKey(block.starts_at) !== salonDayKey(displayEnd);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"Delete " + blockReasonLabel(block.block_reason)}
      onPress={onEdit}
    >
      <Card
        style={{
          gap: 14,
          marginBottom: 16,
          backgroundColor: c.muted,
          borderColor: c.mutedForeground,
          borderLeftWidth: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <CalendarActivityDot type={activityColor(block) || "blocked"} size={10} />
          <OwnerText size={23} bold>
            {blockReasonLabel(block.block_reason)}
          </OwnerText>
        </View>
        <OwnerText>
          {block.all_day
            ? "All day"
            : timeLabel(block.starts_at) +
              "–" +
              timeLabel(block.ends_at) +
              " · " +
              appointmentDuration(block.starts_at, block.ends_at)}
        </OwnerText>
        <OwnerText size={16} muted>
          {dateLabel(block.starts_at)}
          {block.all_day || spansDays ? " · Ends " + dateLabel(displayEnd) : ""}
        </OwnerText>
        {!!(block.block_description || block.note) && (
          <OwnerText>{block.block_description || block.note}</OwnerText>
        )}
        {!!block.block_series_id && (
          <OwnerText size={16} muted>
            Repeats {block.block_repeat}
            {block.block_repeat_until
              ? " through " + dateLabel(block.block_repeat_until + "T12:00:00-04:00")
              : ""}
          </OwnerText>
        )}
        <OwnerText size={16} muted>
          Unavailable for customer bookings
        </OwnerText>
        <OwnerText size={16} muted>
          Tap to delete
        </OwnerText>
      </Card>
    </Pressable>
  );
}
