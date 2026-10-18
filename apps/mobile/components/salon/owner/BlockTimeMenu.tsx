import React from "react";
import { ScrollView } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { blockReasons } from "@/lib/salon/calendarActivity";
import Icon from "@/lib/icons/LucideIcon";
import { Txt, useColors } from "../ui";
export default function BlockTimeMenu({ onSelect }: { onSelect: (reason: string) => void }) {
  const c = useColors();
  return (
    <Select
      value={{ value: "", label: "" }}
      onValueChange={(option) => {
        if (option) onSelect(option.value);
      }}
    >
      <SelectTrigger
        accessibilityLabel="Block time"
        style={{
          minHeight: 58,
          height: "auto",
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
          gap: 10,
          backgroundColor: c.card,
          borderColor: c.border,
        }}
      >
        <Icon name="CalendarX2" size={21} color={c.foreground} />
        <Txt size={20} bold>
          Block time
        </Txt>
      </SelectTrigger>
      <SelectContent position="popper" insets={{ top: 20, bottom: 20, left: 20, right: 20 }}>
        <ScrollView style={{ maxHeight: 330 }} keyboardShouldPersistTaps="handled">
          {blockReasons.map((reason) => (
            <SelectItem
              key={reason.value}
              value={reason.value}
              label={reason.label}
              textClassName="text-xl native:text-xl"
              style={{ minHeight: 58 }}
            />
          ))}
        </ScrollView>
      </SelectContent>
    </Select>
  );
}
