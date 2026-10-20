import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, Animated, Platform, StyleSheet } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Card, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
export default function MariaPanel(_: { demo: boolean }) {
  const c = useColors();
  const [voiceHint, setVoiceHint] = useState(false);
  const [spanish, setSpanish] = useState(false);
  const reducedMotion = useReducedMotionPreference();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion !== false) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 240,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 240,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [pulse, reducedMotion]);
  return (
    <View style={{ gap: 20, maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
        <OwnerButton
          label="English"
          secondary={spanish}
          onPress={() => {
            setSpanish(false);
          }}
        />
        <OwnerButton
          label="Español"
          secondary={!spanish}
          onPress={() => {
            setSpanish(true);
          }}
        />
      </View>
      <Card style={{ gap: 18, alignItems: "center", paddingVertical: 30, width: "100%" }}>
        <View style={{ padding: 14 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderWidth: 2,
                borderColor: c.tertiary,
                borderRadius: 104,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                transform: [
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
                ],
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Hablar con Maria" : "Talk to Maria"}
            accessibilityHint={
              spanish ? "La voz todavía no está conectada" : "Voice is not connected yet"
            }
            onPress={() => setVoiceHint(true)}
            style={({ pressed }) => ({
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: c.primary,
              borderWidth: 3,
              borderColor: c.tertiary,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Icon name="Mic" size={54} color={c.primaryForeground} />
          </Pressable>
        </View>
        <OwnerText size={28} bold>
          {spanish ? "Habla con Maria" : "Talk to Maria"}
        </OwnerText>
        {voiceHint && (
          <OwnerText size={17} muted>
            {spanish
              ? "OpenAI Realtime todavía no está conectado. No se graba audio."
              : "OpenAI Realtime is not connected yet. No audio is being recorded."}
          </OwnerText>
        )}
      </Card>
    </View>
  );
}
