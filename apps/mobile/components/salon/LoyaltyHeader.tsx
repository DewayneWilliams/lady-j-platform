import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, ScrollView, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Icon from "@/lib/icons/LucideIcon";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { nextReward, rewardMilestones, RewardSummary } from "@/lib/salon/loyalty";
import { Txt, useColors } from "./ui";

export default function LoyaltyHeader({ rewards }: { rewards: RewardSummary }) {
  const c = useColors();
  const reduced = useReducedMotionPreference();
  const focused = useIsFocused();
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.45)).current;
  const [meterWidth, setMeterWidth] = useState(0);
  const upcoming = rewardMilestones.find((milestone) => rewards.points < milestone.points);
  const next = upcoming || nextReward(Number(rewards.points));
  const previous = [...rewardMilestones].reverse().find((item) => rewards.points >= item.points);
  const start = previous?.points || 0;
  const fraction = upcoming ? Math.max(0, Math.min(1, (rewards.points - start) / Math.max(1, next.points - start))) : 1;
  const message = useMemo(() => {
    const remaining = Math.max(0, next.points - rewards.points);
    if (remaining > 0) return `You're only ${Math.ceil(remaining).toLocaleString("en-TT")} points from your next milestone!`;
    const messages = ["Your glow is growing!", "Every visit brings a little more magic."];
    return messages[Math.floor(rewards.points) % messages.length];
  }, [next.points, rewards.points]);

  useEffect(() => {
    if (reduced) {
      progress.setValue(fraction);
      return;
    }
    Animated.spring(progress, { toValue: fraction, damping: 18, stiffness: 120, mass: 0.8, useNativeDriver: Platform.OS !== "web" }).start();
  }, [fraction, progress, reduced]);

  useEffect(() => {
    if (reduced !== false || !focused) {
      shimmer.stopAnimation();
      glow.stopAnimation();
      return;
    }
    shimmer.setValue(0);
    const shimmerLoop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== "web" }),
      Animated.delay(900),
      Animated.timing(shimmer, { toValue: 0, duration: 1, useNativeDriver: Platform.OS !== "web" }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.9, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(glow, { toValue: 0.45, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web" }),
    ]));
    shimmerLoop.start();
    glowLoop.start();
    return () => { shimmerLoop.stop(); glowLoop.stop(); };
  }, [focused, glow, reduced, shimmer]);

  if (!rewards.enabled) return null;
  return (
    <View style={{ gap: 12, paddingBottom: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
        <Icon name="Crown" size={24} color={c.tertiary} />
        <Txt size={21} bold>Loyalty Program</Txt>
        <Txt size={17} color={c.mutedForeground}>
          {Number(rewards.points).toLocaleString("en-TT", { maximumFractionDigits: 2 })} points · TT${Number(rewards.value_ttd).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Txt>
      </View>
      <Animated.View style={{ opacity: glow }}>
        <View onLayout={(event) => setMeterWidth(event.nativeEvent.layout.width)} style={{ height: 12, borderRadius: 999, overflow: "hidden", backgroundColor: c.goldSurface, borderWidth: 1, borderColor: c.goldBorder }}>
          <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0, borderRadius: 999, backgroundColor: "#C99728", transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-meterWidth / 2, 0] }) }, { scaleX: progress }] }}>
            {!reduced && <Animated.View pointerEvents="none" style={{ position: "absolute", top: -8, bottom: -8, width: 42, backgroundColor: "rgba(255,255,255,0.55)", transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-50, 760] }) }, { rotate: "18deg" }] }} />}
          </Animated.View>
        </View>
      </Animated.View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
        {rewardMilestones.map((milestone) => {
          const reached = rewards.points >= milestone.points;
          return (
            <View key={milestone.points} accessibilityLabel={`${milestone.name}, ${milestone.points} points, TT$${milestone.value}`} style={{ minWidth: 148, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: reached ? c.tertiary : c.goldBorder, backgroundColor: reached ? c.goldSurface : c.card }}>
              <Txt size={15} bold>{milestone.name}</Txt>
              <Txt size={13} color={c.mutedForeground}>{milestone.points.toLocaleString("en-TT")} points · TT${milestone.value}</Txt>
            </View>
          );
        })}
      </ScrollView>
      <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>{message}</Txt>
    </View>
  );
}
