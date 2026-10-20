import React, { useState } from "react";
import { View, Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { salonDayKey as todayKey } from "@/lib/salon/ownerToday";
import { Txt, useColors } from "./ui";
export default function CalendarPicker({
  value,
  onChange,
  unrestricted = false,
}: {
  value: string;
  unrestricted?: boolean;
  onChange: (d: string) => void;
}) {
  const c = useColors();
  const [month, setMonth] = useState(() => new Date(`${value || todayKey()}T12:00:00Z`));
  const year = month.getUTCFullYear(),
    m = month.getUTCMonth(),
    days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate(),
    offset = new Date(Date.UTC(year, m, 1)).getUTCDay();
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(new Date(Date.UTC(year, m - 1, 1)))}
          style={{ padding: 14 }}
        >
          <Icon name="ChevronLeft" color={c.foreground} size={20} />
        </Pressable>
        <Txt bold size={18}>
          {month.toLocaleDateString("en-TT", { month: "long", year: "numeric", timeZone: "UTC" })}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(new Date(Date.UTC(year, m + 1, 1)))}
          style={{ padding: 14 }}
        >
          <Icon name="ChevronRight" color={c.foreground} size={20} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((v, i) => (
          <View key={i} style={{ width: "14.285%", alignItems: "center", paddingBottom: 12 }}>
            <Txt size={13} color={c.mutedForeground}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: offset + days }, (_, i) => {
          const n = i - offset + 1;
          const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
          const day = i % 7,
            disabled = n < 1 || (!unrestricted && (key < todayKey() || day === 0 || day === 1));
          return (
            <Pressable
              key={i}
              disabled={disabled}
              accessibilityRole={n > 0 ? "button" : undefined}
              accessibilityLabel={n > 0 ? key : undefined}
              accessibilityState={{ selected: value === key, disabled }}
              onPress={() => onChange(key)}
              style={{
                width: "14.285%",
                height: 49,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n > 0 && (
                <View
                  style={{
                    minWidth: 40,
                    minHeight: 48,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    backgroundColor: value === key ? c.primary : "transparent",
                  }}
                >
                  <Txt
                    size={18}
                    bold
                    color={
                      value === key
                        ? c.primaryForeground
                        : disabled
                          ? c.mutedForeground
                          : c.foreground
                    }
                  >
                    {n}
                  </Txt>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
