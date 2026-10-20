import React, { useState, useEffect, useMemo } from "react";
import { View, Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Appointment } from "@/lib/salon/types";
import { activityLegend, dotsOnDate } from "@/lib/salon/calendarActivity";
import { salonDayKey } from "@/lib/salon/ownerToday";
import { Card, Txt, ButtonLabel, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import CalendarActivityDot from "./CalendarActivityDot";
import CalendarLegend from "./CalendarLegend";
import BlockTimeMenu from "./BlockTimeMenu";
import CurrentDateOutline from "./CurrentDateOutline";
export default function CalendarTools({
  date,
  selected,
  view,
  onDate,
  onMonthChange,
  onView,
  onAdd,
  onBlock,
  appointments,
  live,
  status,
}: {
  date: string;
  selected: boolean;
  view: string;
  onDate: (v: string) => void;
  onMonthChange: () => void;
  onView: (v: string) => void;
  onAdd: () => void;
  onBlock: (reason: string) => void;
  appointments: Appointment[];
  live: boolean;
  status: string;
}) {
  const c = useColors();
  const [month, setMonth] = useState(new Date(date + "T12:00Z"));
  useEffect(() => {
    const d = new Date(date + "T12:00Z");
    if (!Number.isNaN(d.valueOf())) setMonth(d);
  }, [date]);
  const y = month.getUTCFullYear(),
    m = month.getUTCMonth();
  const offset = new Date(Date.UTC(y, m, 1)).getUTCDay(),
    days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const keyFor = (n: number) =>
    y + "-" + String(m + 1).padStart(2, "0") + "-" + String(n).padStart(2, "0");
  const dots = useMemo(
    () =>
      new Map(
        Array.from({ length: days }, (_, i) => {
          const key =
            y + "-" + String(m + 1).padStart(2, "0") + "-" + String(i + 1).padStart(2, "0");
          return [key, dotsOnDate(appointments, key)] as const;
        }),
      ),
    [appointments, y, m, days],
  );
  const today = salonDayKey();
  return (
    <View style={{ gap: 18, marginBottom: selected ? 18 : 0 }}>
      <View style={{ gap: 6 }}>
        <OwnerText size={30} bold>
          Calendar
        </OwnerText>
        <OwnerText size={16} muted>
          {live
            ? status === "live"
              ? "Live calendar · Trinidad & Tobago"
              : "Reconnecting to live calendar Pull to refresh."
            : "Trinidad & Tobago"}
        </OwnerText>
      </View>
      <CalendarLegend />
      <Card style={{ padding: 0, overflow: "hidden", width: "100%" }}>
        <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => {
              setMonth(new Date(Date.UTC(y, m - 1, 1, 12)));
              onMonthChange();
            }}
            style={{ width: 48, height: 54, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="ChevronLeft" color={c.foreground} size={24} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <OwnerText size={22} bold>
              {month.toLocaleDateString("en-TT", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </OwnerText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => {
              setMonth(new Date(Date.UTC(y, m + 1, 1, 12)));
              onMonthChange();
            }}
            style={{ width: 48, height: 54, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="ChevronRight" color={c.foreground} size={24} />
          </Pressable>
        </View>
        <View accessibilityLabel="Full month calendar" style={{ paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", marginBottom: 6 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <View key={day} style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
                <Txt size={14} bold color={c.mutedForeground}>
                  {day}
                </Txt>
              </View>
            ))}
          </View>
          {Array.from({ length: Math.ceil((offset + days) / 7) }, (_, week) => (
            <View key={week} style={{ flexDirection: "row" }}>
              {Array.from({ length: 7 }, (_, weekday) => {
                const n = week * 7 + weekday - offset + 1,
                  valid = n > 0 && n <= days,
                  key = keyFor(n),
                  active = selected && date === key,
                  types = dots.get(key) || [];
                return (
                  <Pressable
                    key={weekday}
                    disabled={!valid}
                    accessibilityLabel={valid ? key : undefined}
                    accessibilityHint={
                      valid
                        ? types.length
                          ? types
                              .map((type) => activityLegend.find((i) => i.key === type)?.label)
                              .join(", ")
                          : "Select to view activity"
                        : undefined
                    }
                    accessibilityRole={valid ? "button" : undefined}
                    accessibilityState={{ selected: active }}
                    onPress={() => onDate(key)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 60,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {valid && (
                      <View
                        style={{
                          width: "94%",
                          maxWidth: 54,
                          minHeight: 54,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: active ? 1 : 0,
                          borderColor: c.brandAccent,
                          backgroundColor: active ? c.brandAccentSurface : "transparent",
                          gap: 5,
                        }}
                      >
                        {key === today && <CurrentDateOutline />}
                        <ButtonLabel size={21}>{n}</ButtonLabel>
                        <View
                          testID={"calendar-dots-" + key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 2,
                            height: 7,
                            width: "100%",
                          }}
                        >
                          {types.map((type) => (
                            <CalendarActivityDot key={type} type={type} size={5} />
                          ))}
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Txt size={14} color={c.mutedForeground}>
              Filled dots show activity. Tap a date.
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show today’s activity"
              onPress={() => onDate(today)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 10,
                paddingVertical: 12,
              }}
            >
              <ButtonLabel>Today</ButtonLabel>
            </Pressable>
          </View>
        </View>
      </Card>
      <View
        testID="calendar-actions"
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
          minHeight: 80,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <OwnerButton label="Add Appointment" onPress={onAdd} compact fill accent />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <BlockTimeMenu onSelect={onBlock} />
        </View>
      </View>
      {selected && (
        <>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: c.muted,
              borderRadius: 14,
              padding: 5,
              gap: 4,
            }}
          >
            {["Day", "Week", "Month"].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: v === view }}
                onPress={() => onView(v)}
                style={{
                  flex: 1,
                  minHeight: 52,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  minWidth: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor: v === view ? c.card : "transparent",
                }}
              >
                <ButtonLabel size={20}>{v}</ButtonLabel>
              </Pressable>
            ))}
          </View>
          <OwnerText size={24} bold>
            {view === "Month"
              ? "This month’s activity"
              : view === "Week"
                ? "Seven-day activity"
                : "Selected day"}
          </OwnerText>
        </>
      )}
    </View>
  );
}
