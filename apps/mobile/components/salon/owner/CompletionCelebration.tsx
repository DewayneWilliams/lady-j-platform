import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import React, { useRef, useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import CelebrationPortal from "./CelebrationPortal";
export default function CompletionCelebration({
  onStart,
  onDone,
}: {
  onStart: () => void;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const started = useRef(false);
  const reduced = useReducedMotionPreference();
  const callbacks = useRef({ onStart, onDone });
  callbacks.current = { onStart, onDone };
  useEffect(() => {
    if (reduced !== true) return;
    if (!started.current) {
      started.current = true;
      callbacks.current.onStart();
    }
    const timer = setTimeout(() => callbacks.current.onDone(), 1800);
    return () => clearTimeout(timer);
  }, [reduced]);
  return (
    <CelebrationPortal>
      <View
        testID="service-celebration"
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          zIndex: 10000,
          elevation: 10000,
          overflow: "hidden",
        }}
      >
        {reduced === false && (
          <>
            <ConfettiCannon
              count={200}
              origin={{ x: width / 2, y: height }}
              explosionSpeed={55}
              fallSpeed={1500}
              fadeOut
              onAnimationStart={() => {
                if (!started.current) {
                  started.current = true;
                  onStart();
                }
              }}
              onAnimationEnd={onDone}
            />
            <ConfettiCannon
              count={100}
              origin={{ x: width * 0.25, y: height * 0.55 }}
              explosionSpeed={60}
              fallSpeed={1400}
              autoStartDelay={50}
              fadeOut
            />
          </>
        )}
      </View>
    </CelebrationPortal>
  );
}
