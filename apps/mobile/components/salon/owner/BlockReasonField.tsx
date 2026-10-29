import React from "react";
import { ScrollView, View } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { blockReasons, allBlockReasons } from "@/lib/salon/calendarActivity";
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
  const selected = allBlockReasons.find((reason) => reason.value === value) || blockReasons[0];
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      <OwnerText bold>Reason (Optional)</OwnerText>
      <Select
        disabled={disabled}
        value={{ value: selected.value, label: selected.label }}
        onValueChange={(option) => option && onChange(option.value)}
      >
        <SelectTrigger
          accessibilityLabel="Block Time Reason"
          style={{
            minHeight: 56,
            height: "auto",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: c.background,
            borderColor: c.border,
          }}
        >
          <ButtonLabel size={20}>{selected.label}</ButtonLabel>
        </SelectTrigger>
        <SelectContent
          portalHost={ownerEditorPortal}
          position="popper"
          insets={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {allBlockReasons.map((reason) => (
              <SelectItem
                key={reason.value}
                label={reason.label}
                value={reason.value}
                textClassName="text-xl native:text-xl"
                style={{ minHeight: 56 }}
              />
            ))}
          </ScrollView>
        </SelectContent>
      </Select>
    </View>
  );
}
