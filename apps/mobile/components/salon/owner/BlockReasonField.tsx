import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { blockReasons, allBlockReasons } from "@/lib/salon/calendarActivity";
import { ButtonLabel, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

export default function BlockReasonField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const c = useColors();
  const colors = {
    blocked: c.calendarBlocked,
    vip: c.calendarVip,
    consultation: c.calendarConsultation,
    event: c.calendarEvent,
  };
  const selected = allBlockReasons.find((reason) => reason.value === value) || blockReasons[0];
  return (
    <View style={{ gap: 10, marginBottom: 18 }}>
      <OwnerText bold>Reason</OwnerText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        accessibilityLabel="Block time reasons"
      >
        {blockReasons.map((reason) => {
          const active = reason.value === selected.value;
          return (
            <Pressable
              key={reason.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={reason.label}
              disabled={disabled}
              onPress={() => onChange(reason.value)}
              style={({ pressed }) => ({
                minHeight: 54,
                justifyContent: "center",
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors[reason.color] : c.border,
                backgroundColor: active ? c.brandAccentSurface : c.background,
                opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
              })}
            >
              <ButtonLabel
                singleLine
                size={18}
                color={active ? colors[reason.color] : c.foreground}
              >
                {reason.label}
              </ButtonLabel>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
