import React from "react";
import { ScrollView, View } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { predefinedServiceCategories } from "@/lib/salon/categories";
import { useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
import { ownerEditorPortal } from "./OwnerEditorPortal";

export default function ServiceCategoryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useColors();
  const categories = [...new Set([...predefinedServiceCategories, value].filter(Boolean))];
  return (
    <View style={{ gap: 10, marginBottom: 20 }}>
      <OwnerText bold>Service category</OwnerText>
      <Select
        value={{ value, label: value }}
        onValueChange={(option) => {
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          accessibilityLabel="Service category"
          style={{
            minHeight: 58,
            height: "auto",
            borderRadius: 12,
            paddingHorizontal: 15,
            paddingVertical: 15,
            backgroundColor: c.background,
            borderColor: c.border,
          }}
        >
          <OwnerText>{value || "Select a category"}</OwnerText>
        </SelectTrigger>
        <SelectContent
          portalHost={ownerEditorPortal}
          position="popper"
          insets={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
            {categories.map((category) => (
              <SelectItem
                key={category}
                label={category}
                value={category}
                textClassName="text-xl native:text-xl"
                style={{ minHeight: 58 }}
              />
            ))}
          </ScrollView>
        </SelectContent>
      </Select>
    </View>
  );
}
