import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import CelebrationPortal from "./CelebrationPortal";
import { Txt, useColors } from "../ui";
export const appreciationMessages = [
  "You Made Someone's Day!",
  "Your Gift Makes a Difference!",
  "Another Client, Another Smile!",
  "You're Changing Lives!",
  "Your Talent Brings Joy!",
] as const;
export type OwnerFeedbackValue = { id: number; message: string; duration: number };
export default function OwnerFeedback({
  value,
  onDismiss,
}: {
  value: OwnerFeedbackValue;
  onDismiss: () => void;
}) {
  const c = useColors();
  const callback = useRef(onDismiss);
  callback.current = onDismiss;
  useEffect(() => {
    const timer = setTimeout(() => callback.current(), value.duration);
    return () => clearTimeout(timer);
  }, [value.id, value.duration]);
  return (
    <CelebrationPortal>
      <View
        pointerEvents="none"
        testID="owner-feedback"
        accessibilityLiveRegion="polite"
        style={{
          position: "absolute",
          top: "35%",
          left: 16,
          right: 16,
          zIndex: 10003,
          alignItems: "center",
        }}
      >
        <View
          style={{
            maxWidth: 600,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.goldBorder,
            borderRadius: 24,
            padding: 24,
          }}
        >
          <Txt size={26} bold style={{ textAlign: "center" }}>
            {value.message}
          </Txt>
        </View>
      </View>
    </CelebrationPortal>
  );
}
