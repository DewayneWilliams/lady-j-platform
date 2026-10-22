import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet } from "react-native";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";

export default function SubtleShimmer({
  color = "rgba(255,255,255,0.34)",
  interval = 15000,
  borderRadius = 14,
  travelDistance = 230,
}: {
  color?: string;
  interval?: number;
  borderRadius?: number;
  travelDistance?: number;
}) {
  const reducedMotion = useReducedMotionPreference();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion !== false) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(interval),
        Animated.timing(progress, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [interval, progress, reducedMotion]);

  if (reducedMotion !== false) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { overflow: "hidden", borderRadius, pointerEvents: "none" },
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: -30,
          bottom: -30,
          left: -32,
          width: 18,
          backgroundColor: color,
          opacity: progress.interpolate({
            inputRange: [0, 0.12, 0.5, 0.88, 1],
            outputRange: [0, 0.32, 0.52, 0.32, 0],
          }),
          transform: [
            { rotate: "22deg" },
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, travelDistance],
              }),
            },
          ],
        }}
      />
    </Animated.View>
  );
}
