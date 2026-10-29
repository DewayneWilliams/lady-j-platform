import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { Card, Txt, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

/** Maria's talk ring, microphone control and status line, shared by the demo and live panels. */
export default function MariaRing({
  state,
  volume,
  status,
  description,
  onPress,
  children,
}: {
  state: VoiceState;
  volume: number;
  status: string;
  description: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const voiceColor = {
    idle: c.mutedForeground,
    listening: c.paymentPaid,
    processing: c.calendarConsultation,
    speaking: c.brandAccent,
    error: c.attentionBorder,
  }[state];

  useEffect(() => {
    if (reducedMotion !== false) {
      motion.setValue(0);
      return;
    }
    const duration = state === "error" ? 400 : state === "processing" ? 900 : 1200;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      { iterations: state === "error" ? 2 : -1 },
    );
    animation.start();
    return () => animation.stop();
  }, [motion, reducedMotion, state]);

  const scale =
    state === "speaking"
      ? 1 + Math.min(volume / 80, 0.06)
      : motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, state === "listening" ? 1.09 : 1.05],
        });

  return (
    <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <Card style={{ gap: 16, alignItems: "center", paddingVertical: 30, width: "100%" }}>
        <View style={{ padding: 14 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderWidth: state === "processing" ? 4 : 3,
                borderColor: voiceColor,
                borderRadius: 104,
                opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                transform: [
                  { scale },
                  {
                    rotate:
                      state === "processing"
                        ? motion.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          })
                        : "0deg",
                  },
                ],
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === "idle" ? "Start Maria voice conversation" : "Stop Maria"}
            accessibilityHint="Maria speaks first and listens only while the conversation is active"
            onPress={onPress}
            style={({ pressed }) => ({
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: c.primary,
              borderWidth: 3,
              borderColor: voiceColor,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Icon
              name={
                state === "processing"
                  ? "LoaderCircle"
                  : state === "speaking"
                    ? "AudioLines"
                    : "Mic"
              }
              size={54}
              color={c.primaryForeground}
            />
          </Pressable>
        </View>
        <OwnerText size={28} bold>
          Talk to Maria
        </OwnerText>
        <Txt
          accessibilityLiveRegion="polite"
          size={15}
          bold
          color={voiceColor}
          style={{ textAlign: "center" }}
        >
          {status}
        </Txt>
        <View style={{ maxWidth: 610 }}>
          <OwnerText>{description}</OwnerText>
        </View>
        {children}
      </Card>
    </View>
  );
}
