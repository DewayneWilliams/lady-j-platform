import React from "react";
import { Pressable } from "react-native";
import { ButtonLabel, useColors } from "../ui";
export default function BlockTimeMenu({ onSelect }: { onSelect: (reason: string) => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Block Time"
      onPress={() => onSelect("personal")}
      style={({ pressed }) => ({
        minHeight: 80,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.brandAccent,
        backgroundColor: c.brandAccentSurface,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 14,
        flexGrow: 1,
        maxWidth: "100%",
        minWidth: 0,
        opacity: pressed ? 0.98 : 1,
      })}
    >
      <ButtonLabel size={20} color={c.brandAccent}>
        Block Time
      </ButtonLabel>
    </Pressable>
  );
}
