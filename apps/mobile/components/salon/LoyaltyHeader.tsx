import { useFonts, PlayfairDisplay_700Bold } from "@expo-google-fonts/dev";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Icon from "@/lib/icons/LucideIcon";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { check, db } from "@/lib/salon/client";
import { dateLabel } from "@/lib/salon/types";
import { royaltyLevel, royaltyLevels, RewardSummary } from "@/lib/salon/loyalty";
import { Action, ErrorBox, Txt, useColors } from "./ui";
import SubtleShimmer from "./SubtleShimmer";

const levelAccents = ["#CE007F", "#D73E8D", "#A36A13", "#C28B18", "#7543B8", "#9D4B79", "#5A2A72"];

function JourneyChevron({
  direction,
  disabled,
  onPress,
  compact = false,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const c = useColors();
  const reduced = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const animate = (value: number) => {
    if (reduced !== false) return motion.setValue(0);
    Animated.spring(motion, {
      toValue: value,
      speed: 28,
      bounciness: 4,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  return (
    <Animated.View
      pointerEvents={disabled ? "none" : "auto"}
      style={{
        opacity: disabled ? 0 : 1,
        transform: [
          {
            scale: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.97, 1, 1.08],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${direction === "left" ? "Previous" : "Next"} Royalty level`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(-1)}
        onPressOut={() => animate(0)}
        onHoverIn={() => animate(1)}
        onHoverOut={() => animate(0)}
        hitSlop={0}
        style={{
          width: compact ? 28 : 44,
          height: compact ? 28 : 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={direction === "left" ? "ChevronLeft" : "ChevronRight"}
          size={14}
          strokeWidth={1.5}
          color={c.foreground}
        />
      </Pressable>
    </Animated.View>
  );
}

function RoyaltyJourneyCard({
  item,
  width,
  current,
  achieved,
  onPress,
}: {
  item: (typeof royaltyLevels)[number];
  width: number;
  current: boolean;
  achieved: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const reduced = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);
  const [lifted, setLifted] = useState(false);
  const animate = (value: number) => {
    if (reduced !== false) return motion.setValue(0);
    Animated.spring(motion, {
      toValue: value,
      speed: 24,
      bounciness: 5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.97, 1, 1.03],
            }),
          },
          {
            translateY: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 0, -2],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.visits} qualifying visits, ${current ? "current level" : achieved ? "achieved" : "upcoming"}`}
        onPress={onPress}
        onPressIn={() => {
          setLifted(true);
          animate(-1);
        }}
        onPressOut={() => {
          setLifted(hovered.current);
          animate(hovered.current ? 1 : 0);
        }}
        onHoverIn={() => {
          hovered.current = true;
          setLifted(true);
          animate(1);
        }}
        onHoverOut={() => {
          hovered.current = false;
          setLifted(false);
          animate(0);
        }}
        style={{
          width,
          height: 62,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 14,
          justifyContent: "center",
          borderWidth: current ? 2 : 1,
          borderColor: current || achieved ? c.goldBorder : c.border,
          backgroundColor: current ? c.headerGold : achieved ? c.goldSurface : c.card,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          overflow: "hidden",
          shadowColor: c.foreground,
          shadowOpacity: lifted ? 0.12 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          paddingTop: 0,
          paddingBottom: 0
        }}
      >
        {current && <SubtleShimmer interval={14000} travelDistance={width + 60} />}
        <Txt size={22}>{item.icon}</Txt>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={15} bold color={current ? c.headerInk : c.foreground}>
            {item.name}
          </Txt>
          <Txt size={11} color={current ? c.headerInk : c.mutedForeground}>
            {item.visits === 0 ? "Your starting level" : `${item.visits} visits`}
          </Txt>
        </View>
        {achieved && <Icon name="CircleCheck" size={18} color={c.tertiary} />}
        {current && (
          <Txt size={10} bold color={c.headerInk}>
            CURRENT
          </Txt>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function LoyaltyHeader({
  rewards,
  firstName,
  onChanged,
  compact = false,
}: {
  rewards: RewardSummary;
  firstName: string;
  onChanged: () => Promise<void>;
  compact?: boolean;
}) {
  const c = useColors();
  const focused = useIsFocused();
  const reduced = useReducedMotionPreference();
  const { width } = useWindowDimensions();
  const journey = useRef<FlatList<(typeof royaltyLevels)[number]>>(null);
  const shimmer = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const royalty = rewards.royalty || {
    level: 1,
    annual_visits: 0,
    lifetime_visits: 0,
    anniversary: new Date().toISOString().slice(0, 10),
  };
  const [journeyWidth, setJourneyWidth] = useState(0);
  const [journeyIndex, setJourneyIndex] = useState(Math.max(0, royalty.level - 1));
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationError, setCelebrationError] = useState("");
  const level = royaltyLevel(royalty.level);
  const next = royaltyLevels[royalty.level] || null;
  const progressFraction = next
    ? Math.max(
        0,
        Math.min(1, (royalty.annual_visits - level.visits) / (next.visits - level.visits)),
      )
    : 1;
  const remaining = next ? Math.max(0, next.visits - royalty.annual_visits) : 0;
  const cardWidth = Math.max(166, (journeyWidth || Math.min(width, 720)) / 1.72);

  useEffect(() => {
    if (focused) setCelebrating(!!rewards.pending_level);
  }, [focused, rewards.pending_level]);
  useEffect(() => {
    if (!focused || reduced !== false) {
      shimmer.setValue(1);
      return;
    }
    shimmer.setValue(0);
    Animated.timing(shimmer, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [focused, reduced, shimmer]);
  useEffect(() => {
    if (reduced) {
      progress.setValue(progressFraction);
      return;
    }
    Animated.timing(progress, {
      toValue: progressFraction,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressFraction, reduced]);
  useEffect(() => {
    if (!journeyWidth) return;
    const index = Math.max(0, royalty.level - 1);
    setJourneyIndex(index);
    const timer = setTimeout(
      () =>
        journey.current?.scrollToOffset({
          offset: index * (cardWidth + 12),
          animated: reduced === false,
        }),
      0,
    );
    return () => clearTimeout(timer);
  }, [cardWidth, journeyWidth, reduced, royalty.level]);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold
  });

  if (!fontsLoaded) {
    return null;
  }

  const scrollTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(royaltyLevels.length - 1, index));
    setJourneyIndex(nextIndex);
    journey.current?.scrollToOffset({
      offset: nextIndex * (cardWidth + 12),
      animated: reduced === false,
    });
  };
  if (!rewards.enabled) return null;
  return (
    <View style={{ gap: compact ? 0 : 5, paddingBottom: compact ? 0 : 4 }}>
      <Txt size={18} bold style={{
        textAlign: "center",
        fontSize: 14,
        fontFamily: "PlayfairDisplay_700Bold"
      }}>
        Royalty Program
      </Txt>
      <View
        onLayout={(event) => setJourneyWidth(event.nativeEvent.layout.width)}
        style={{
          width: "100%",
          height: compact ? 62 : 70,
          justifyContent: "center",
        }}
      >
        <FlatList
          ref={journey}
          horizontal
          data={royaltyLevels}
          keyExtractor={(item) => String(item.level)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={{
            gap: 12,
            paddingHorizontal: Math.max(44, (journeyWidth - cardWidth) / 2),
          }}
          onMomentumScrollEnd={(event) =>
            setJourneyIndex(
              Math.max(
                0,
                Math.min(
                  royaltyLevels.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12)),
                ),
              ),
            )
          }
          renderItem={({ item, index }) => {
            const current = item.level === royalty.level;
            const achieved = item.level < royalty.level;
            return (
              <RoyaltyJourneyCard
                item={item}
                width={cardWidth}
                current={current}
                achieved={achieved}
                onPress={() => scrollTo(index)}
              />
            );
          }}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <JourneyChevron
          direction="left"
          disabled={journeyIndex === 0}
          onPress={() => scrollTo(journeyIndex - 1)}
          compact={compact}
        />
        <Txt size={12} bold style={{ textAlign: "center" }}>
          Explore Royalty Levels
        </Txt>
        <JourneyChevron
          direction="right"
          disabled={journeyIndex === royaltyLevels.length - 1}
          onPress={() => scrollTo(journeyIndex + 1)}
          compact={compact}
        />
      </View>
      <Modal
        visible={celebrating && !!rewards.pending_level}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.64)",
            alignItems: "center",
            justifyContent: "center",
            padding: 22,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 18,
              padding: 22,
              gap: 16,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.goldBorder,
            }}
          >
            <View style={{ alignItems: "center", gap: 7 }}>
              <Icon name="Crown" size={36} color={c.tertiary} />
              <Txt size={25} bold style={{ textAlign: "center" }}>
                Congratulations, {firstName || rewards.first_name || "Royal Guest"}!
              </Txt>
              <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
                You have reached a new Lady J Royalty level.
              </Txt>
            </View>
            <View
              style={{
                borderRadius: 18,
                padding: 20,
                backgroundColor: c.headerGold,
                borderWidth: 1,
                borderColor: c.goldBorder,
              }}
            >
              <Txt size={30} style={{ textAlign: "center" }}>
                {royaltyLevel(rewards.pending_level?.level || 1).icon}
              </Txt>
              <Txt size={21} bold color={c.headerInk} style={{ textAlign: "center" }}>
                {royaltyLevel(rewards.pending_level?.level || 1).name}
              </Txt>
              <Txt size={13} color={c.headerInk} style={{ textAlign: "center" }}>
                👑 Lady J Royalty Program
              </Txt>
            </View>
            {!!celebrationError && <ErrorBox message={celebrationError} />}
            <Action
              label="Continue"
              onPress={() => {
                const achieved = rewards.pending_level?.level;
                if (!achieved) return setCelebrating(false);
                setCelebrationError("");
                void Promise.resolve(
                  db().rpc("lj_acknowledge_royalty_level", { p_level: achieved }),
                )
                  .then(check)
                  .then(onChanged)
                  .then(() => setCelebrating(false))
                  .catch((reason: unknown) =>
                    setCelebrationError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to save this celebration. Try again.",
                    ),
                  );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function LoyaltyHistory({ rewards }: { rewards: RewardSummary }) {
  const c = useColors();
  const royalty = rewards.royalty || {
    level: 1,
    annual_visits: 0,
    lifetime_visits: 0,
    anniversary: new Date().toISOString().slice(0, 10),
  };
  const timeline = useMemo(
    () =>
      [
        ...(rewards.level_history || []).map((item) => ({
          id: `level-${item.id}`,
          title: `${royaltyLevel(item.level).icon} ${royaltyLevel(item.level).name} achieved`,
          detail: `${item.annual_visits} visits`,
          date: item.achieved_at,
        })),
        ...(rewards.visit_history || [])
          .filter((item) => item.status === "qualified")
          .map((item) => ({
            id: `visit-${item.id}`,
            title: "Qualifying Royalty visit",
            detail: "Completed and fully paid",
            date: `${item.visit_date}T12:00:00Z`,
          })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20),
    [rewards.level_history, rewards.visit_history],
  );
  if (!rewards.enabled) return null;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          padding: 13,
          borderRadius: 14,
          backgroundColor: c.goldSurface,
          borderWidth: 1,
          borderColor: c.goldBorder,
          gap: 3,
        }}
      >
        <Txt bold>Royalty year anniversary · {dateLabel(royalty.anniversary)}</Txt>
        <Txt size={13} color={c.mutedForeground}>
          Annual progress resets; lifetime visits, levels, and benefits remain. Royalty history
          appears after your first qualifying completed visit.
        </Txt>
      </View>
      {timeline.map((item) => (
        <View
          key={item.id}
          style={{ paddingLeft: 12, borderLeftWidth: 2, borderColor: c.goldBorder }}
        >
          <Txt size={14} bold>
            {item.title}
          </Txt>
          <Txt size={12} color={c.mutedForeground}>
            {item.detail} · {dateLabel(item.date)}
          </Txt>
        </View>
      ))}
    </View>
  );
}
