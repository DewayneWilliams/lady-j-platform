import React from "react";
import { ScrollView, View } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { blockReasons, allBlockReasons } from "@/lib/salon/calendarActivity";
import { fonts } from "@/lib/salon/design";
import { ButtonLabel, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
import { ownerEditorPortal } from "./OwnerEditorPortal";

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
      <Select
        value={{ value: selected.value, label: selected.label }}
        onValueChange={(option) => {
          if (option && !disabled) onChange(option.value);
        }}
      >
        <SelectTrigger
          disabled={disabled}
          accessibilityLabel="Reason"
          style={{
            minHeight: 58,
            height: "auto",
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 12,
            borderColor: c.border,
            backgroundColor: c.background,
          }}
        >
          <ButtonLabel size={20} color={colors[selected.color]}>
            {selected.label}
          </ButtonLabel>
        </SelectTrigger>
        <SelectContent
          portalHost={ownerEditorPortal}
          position="popper"
          insets={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ScrollView style={{ maxHeight: 330 }} keyboardShouldPersistTaps="handled">
            {blockReasons.map((reason) => (
              <SelectItem
                key={reason.value}
                value={reason.value}
                label={reason.label}
                style={{ minHeight: 58 }}
                textStyle={{ color: colors[reason.color], fontSize: 20, fontFamily: fonts.action }}
              />
            ))}
          </ScrollView>
        </SelectContent>
      </Select>
    </View>
  );
}
