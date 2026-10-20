import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import CelebrationPortal from "./CelebrationPortal";
import { Txt, useColors } from "../ui";
const particles = Array.from({ length: 108 }, (_, i) => ({
  kind: ["bill", "coin", "sign", "bill", "sign", "coin"][i % 6],
  start: ((i * 37) % 100) / 100,
  end: ((i * 61 + 17) % 100) / 100,
  delay: (i % 8) * 0.008,
  spin: i % 2 ? 760 : -680,
  size: 24 + (i % 4) * 7,
}));
export default function MoneyCelebration({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions(),
    c = useColors();
  const progress = useRef(new Animated.Value(0)).current,
    done = useRef(onDone);
  done.current = onDone;
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      const timer = setTimeout(() => done.current(), 1800);
      return () => clearTimeout(timer);
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => animation.stop();
  }, [progress, reduced]);
  return (
    <CelebrationPortal>
      <View
        pointerEvents="none"
        accessibilityLabel="Payment celebration"
        style={{
          ...StyleSheet.absoluteFillObject,
          zIndex: 10001,
          elevation: 10001,
          overflow: "hidden",
        }}
      >
        {reduced === false &&
          particles.map((particle, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: progress.interpolate({
                  inputRange: [0, 0.035, 0.84, 1],
                  outputRange: [0, 1, 1, 0],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [
                        particle.start * (width - 60),
                        particle.end * (width - 60),
                        particle.start * (width - 60),
                      ],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 0.12 + particle.delay, 0.75, 1],
                      outputRange: [
                        -80,
                        ((i % 9) / 9) * height - 60,
                        ((i % 9) / 9 + 0.6) * height,
                        ((i % 9) / 9 + 1.15) * height,
                      ],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", particle.spin + "deg"],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.15, 0.85, 1],
                      outputRange: [0.5, 1.15, 1, 0.7],
                    }),
                  },
                ],
              }}
            >
              {particle.kind === "bill" ? (
                <View
                  style={{
                    width: 52,
                    height: 28,
                    backgroundColor: c.paymentPaidBadge,
                    borderWidth: 2,
                    borderColor: c.paymentPaidBadgeForeground,
                    borderRadius: 3,
                    padding: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      right: 3,
                      bottom: 3,
                      borderWidth: 1,
                      borderColor: c.paymentPaidBadgeForeground,
                      borderRadius: 2,
                    }}
                  />
                  <Txt size={16} color={c.paymentPaidBadgeForeground} bold>
                    $
                  </Txt>
                </View>
              ) : particle.kind === "coin" ? (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: c.goldBorder,
                    backgroundColor: c.tertiary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt size={18} color={c.tertiaryForeground} bold>
                    $
                  </Txt>
                </View>
              ) : (
                <Txt size={particle.size} bold color={c.paymentPaid}>
                  $
                </Txt>
              )}
            </Animated.View>
          ))}
      </View>
    </CelebrationPortal>
  );
}
