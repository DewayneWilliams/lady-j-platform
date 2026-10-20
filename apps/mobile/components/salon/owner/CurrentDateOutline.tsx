import React, { useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform, StyleSheet, View } from "react-native";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { useColors } from "../ui";

/** Animate only today's outline; keep the date, dots and touch target still. */
export default function CurrentDateOutline() {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const opacity = useRef(new Animated.Value(1)).current;
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    opacity.setValue(1);
    if (reducedMotion !== false || !foreground) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 240,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [foreground, opacity, reducedMotion]);
  const outline = {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderColor: c.brandAccent,
  };
  return (
    <>
      <View pointerEvents="none" accessible={false} style={{ ...outline, borderWidth: 1 }} />
      <Animated.View
        testID="calendar-current-date-outline"
        pointerEvents="none"
        accessible={false}
        style={{ ...outline, borderWidth: 2, opacity }}
      />
    </>
  );
}
