import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
/** Only the strokes change height; the icon and tab never move. */
export default function AudioWaveIcon({ color }: { color: string }) {
  const phase = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    if (reduced !== false) {
      phase.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 460,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 460,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [phase, reduced]);
  return (
    <View
      testID="maria-nav-wave"
      accessibilityLabel="Maria audio wave"
      style={{
        height: 24,
        width: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      {[10, 20, 14, 22, 10].map((height, i) => (
        <Animated.View
          key={i}
          testID={"maria-wave-" + i}
          style={{
            width: 2.4,
            height,
            borderRadius: 2,
            backgroundColor: color,
            transform: [
              {
                scaleY: phase.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: i % 2 ? [1, 0.45, 0.8] : [0.5, 1, 0.45],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
