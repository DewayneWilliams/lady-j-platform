import React from "react";
import { ScrollView, View } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { predefinedServiceCategories } from "@/lib/salon/categories";
import { ButtonLabel, useColors } from "../ui";
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
  const categories = predefinedServiceCategories;
  return (
    <View style={{ gap: 10, marginBottom: 20 }}>
      <OwnerText bold>Service Category</OwnerText>
      <Select
        value={{ value, label: value }}
        onValueChange={(option) => {
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          accessibilityLabel="Service Category"
          style={{
            minHeight: 58,
            height: "auto",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: c.background,
            borderColor: c.border,
          }}
        >
          <ButtonLabel size={20}>{value || "Select a category"}</ButtonLabel>
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
