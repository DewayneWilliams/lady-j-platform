import React from "react";
import { ScrollView, View } from "react-native";
import { serviceCategories } from "@/lib/salon/categories";
import { Chip, Txt, useColors } from "./ui";
export default function ServiceCategories({
  value,
  onChange,
  booking = false,
  includeAll = true,
}: {
  value: string;
  onChange: (value: string) => void;
  booking?: boolean;
  includeAll?: boolean;
}) {
  const c = useColors();
  const categories = serviceCategories().filter((category) => includeAll || category !== "All");
  return (
    <View style={{ minWidth: 0, marginBottom: booking ? 12 : 18 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Service Categories"
        directionalLockEnabled
        nestedScrollEnabled
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0, minWidth: 0 }}
        contentContainerStyle={{ gap: booking ? 8 : 9, paddingBottom: 8, paddingHorizontal: 2 }}
      >
        {categories.map((category) => (
          <View key={category} style={{ flexShrink: 0 }}>
            <Chip
              label={category}
              selected={value === category}
              onPress={() => onChange(category)}
            />
          </View>
        ))}
      </ScrollView>
      <Txt
        size={11}
        color={c.mutedForeground}
        style={{ textAlign: "center", letterSpacing: 0.2, marginTop: 2 }}
      >
        ← Slide to Explore →
      </Txt>
    </View>
  );
}
