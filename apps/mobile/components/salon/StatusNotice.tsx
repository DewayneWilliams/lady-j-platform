import React from "react";
import { Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { ButtonLabel, useColors } from "./ui";
export default function StatusNotice({
  message,
  onDismiss,
  large: _large = false,
}: {
  message: string;
  onDismiss: () => void;
  large?: boolean;
}) {
  const c = useColors();
  const success =
    /\b(saved|added|updated|received|recorded)\b/i.test(message) &&
    !/\b(unable|failed|not)\b/i.test(message);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLiveRegion="polite"
      accessibilityLabel={"Dismiss message: " + message}
      onPress={onDismiss}
      style={{
        width: "90%",
        maxWidth: 600,
        alignSelf: "center",
        flexShrink: 0,
        marginHorizontal: 20,
        marginVertical: 12,
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: c.foreground,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Icon name={success ? "CircleCheck" : "Info"} size={22} color={c.background} />
      <ButtonLabel color={c.background} style={{ flex: 1 }}>
        {message}
      </ButtonLabel>
      <Icon name="X" size={18} color={c.background} />
    </Pressable>
  );
}
