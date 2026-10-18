import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Platform, StyleSheet, View } from "react-native";
import { Card, useColors } from "../ui";

export default function AttentionCard({
  children,
  urgent,
}: {
  children: React.ReactNode;
  urgent: boolean;
}) {
  const c = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  useEffect(() => {
    let mounted = true;
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const state = AppState.addEventListener("change", (value) => setForeground(value === "active"));
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      motion?.remove();
      state.remove();
    };
  }, []);
  useEffect(() => {
    pulse.setValue(1);
    if (!urgent || reduceMotion || !foreground) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.12,
          duration: 450,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [urgent, reduceMotion, foreground, pulse]);
  const outline = {
    ...StyleSheet.absoluteFillObject,
    borderColor: c.attentionBorder,
    borderRadius: 16,
  };
  return (
    <View testID="owner-attention-card">
      <Card style={{ gap: 6, borderWidth: 0, padding: 26 }}>{children}</Card>
      <View pointerEvents="none" accessible={false} style={{ ...outline, borderWidth: 2 }} />
      <Animated.View
        testID="owner-attention-pulse"
        pointerEvents="none"
        accessible={false}
        style={{ ...outline, borderWidth: 8, opacity: pulse }}
      />
    </View>
  );
}
