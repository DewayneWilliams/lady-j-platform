import React from "react";
import { Pressable } from "react-native";
import { ButtonLabel } from "../ui";
export default function BlockTimeMenu({ onSelect }: { onSelect: (reason: string) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Block Time"
      onPress={() => onSelect("personal")}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#000000",
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexGrow: 1,
        maxWidth: "100%",
        minWidth: 0,
        opacity: pressed ? 0.98 : 1,
      })}
    >
      <ButtonLabel size={18} color="#FFFFFF">
        Block Time
      </ButtonLabel>
    </Pressable>
  );
}
