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

const levelAccents = ["#CE007F", "#D73E8D", "#A36A13", "#C28B18", "#7543B8", "#9D4B79", "#5A2A72"];

export default function LoyaltyHeader({
  rewards,
  firstName,
  onChanged,
}: {
  rewards: RewardSummary;
  firstName: string;
  onChanged: () => Promise<void>;
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
  const levelHistory = rewards.level_history || [];
  const visitHistory = rewards.visit_history || [];
  const rewardHistory = rewards.history || [];
  const entitlements = rewards.entitlements || [];
  const [journeyWidth, setJourneyWidth] = useState(0);
  const [journeyIndex, setJourneyIndex] = useState(Math.max(0, royalty.level - 1));
  const [historyOpen, setHistoryOpen] = useState(false);
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
          offset: Math.max(0, index * (cardWidth + 12) - (journeyWidth - cardWidth) / 2),
          animated: reduced === false,
        }),
      0,
    );
    return () => clearTimeout(timer);
  }, [cardWidth, journeyWidth, reduced, royalty.level]);

  const timeline = useMemo(
    () =>
      [
        ...levelHistory.map((item) => ({
          id: `level-${item.id}`,
          title: `${royaltyLevel(item.level).icon} ${royaltyLevel(item.level).name} achieved`,
          detail: `${item.annual_visits} annual visits`,
          date: item.achieved_at,
        })),
        ...visitHistory
          .filter((item) => item.status === "qualified")
          .map((item) => ({
            id: `visit-${item.id}`,
            title: "Qualifying Royalty visit",
            detail: "Completed and fully paid",
            date: `${item.visit_date}T12:00:00Z`,
          })),
        ...rewardHistory.map((item) => ({
          id: `reward-${item.id}`,
          title: item.reason,
          detail: `${item.points > 0 ? "+" : ""}${Number(item.points).toLocaleString("en-TT")} points`,
          date: item.created_at,
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20),
    [levelHistory, rewardHistory, visitHistory],
  );

  const scrollTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(royaltyLevels.length - 1, index));
    setJourneyIndex(nextIndex);
    journey.current?.scrollToOffset({
      offset: Math.max(0, nextIndex * (cardWidth + 12) - (journeyWidth - cardWidth) / 2),
      animated: reduced === false,
    });
  };
  if (!rewards.enabled) return null;
  return (
    <View style={{ gap: 18, paddingBottom: 24 }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt size={25} bold style={{ textAlign: "center" }}>
          👑 Lady J Royalty Program
        </Txt>
        <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
          Every visit brings you closer to Royalty.
        </Txt>
      </View>
      <View
        onLayout={(event) => setJourneyWidth(event.nativeEvent.layout.width)}
        style={{
          gap: 10,
          width: "100%",
          height: 236,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous Royalty level"
            accessibilityState={{ disabled: journeyIndex === 0 }}
            disabled={journeyIndex === 0}
            onPress={() => scrollTo(journeyIndex - 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.headerGold,
              borderWidth: 1,
              borderColor: c.goldBorder,
              opacity: journeyIndex === 0 ? 0.35 : pressed ? 0.72 : 1,
              transform: reduced === false && pressed ? [{ scale: 0.96 }] : undefined,
            })}
          >
            <Icon name="ChevronLeft" size={22} color={c.headerInk} />
          </Pressable>
          <Txt size={18} bold>
            Royalty Journey
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next Royalty level"
            accessibilityState={{ disabled: journeyIndex === royaltyLevels.length - 1 }}
            disabled={journeyIndex === royaltyLevels.length - 1}
            onPress={() => scrollTo(journeyIndex + 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.headerGold,
              borderWidth: 1,
              borderColor: c.goldBorder,
              opacity: journeyIndex === royaltyLevels.length - 1 ? 0.35 : pressed ? 0.72 : 1,
              transform: reduced === false && pressed ? [{ scale: 0.96 }] : undefined,
            })}
          >
            <Icon name="ChevronRight" size={22} color={c.headerInk} />
          </Pressable>
        </View>
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
            paddingHorizontal: Math.max(0, (journeyWidth - cardWidth) / 2),
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
          renderItem={({ item }) => {
            const current = item.level === royalty.level;
            const achieved = item.level < royalty.level;
            return (
              <View
                accessible
                accessibilityLabel={`${item.name}, ${item.visits} qualifying visits, ${current ? "current level" : achieved ? "achieved" : "upcoming"}`}
                style={{
                  width: cardWidth,
                  minHeight: 150,
                  padding: 18,
                  borderRadius: 16,
                  justifyContent: "space-evenly",
                  borderWidth: current ? 2 : 1,
                  borderColor: current || achieved ? c.goldBorder : c.border,
                  backgroundColor: current ? c.headerGold : achieved ? c.goldSurface : c.card,
                  opacity: item.level > royalty.level ? 0.68 : 1,
                  paddingTop: 8,
                  paddingBottom: 8,
                  height: 108,
                  marginHorizontal: 8,
                  display: "flex",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Txt size={31}>{item.icon}</Txt>
                  {achieved && <Icon name="CircleCheck" size={21} color={c.tertiary} />}
                  {current && (
                    <Txt size={11} bold color={c.headerInk}>
                      CURRENT
                    </Txt>
                  )}
                </View>
                <Txt size={18} bold color={current ? c.headerInk : c.foreground}>
                  {item.name}
                </Txt>
                <View>
                  <Txt size={13} color={current ? c.headerInk : c.mutedForeground}>
                    {item.visits === 0 ? "Your starting level" : `${item.visits} annual visits`}
                  </Txt>
                </View>
              </View>
            );
          }}
          className={"justify-around"}
        />
        <Txt size={14} bold style={{ textAlign: "center" }}>
          Explore Royalty Levels
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: historyOpen }}
        onPress={() => setHistoryOpen((value) => !value)}
        style={{
          minHeight: 52,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="History" size={20} color={c.brandAccent} />
        <Txt bold style={{ flex: 1 }}>
          Royalty History
        </Txt>
        <Icon name={historyOpen ? "ChevronUp" : "ChevronDown"} size={20} color={c.foreground} />
      </Pressable>
      {historyOpen && (
        <View style={{ gap: 10 }}>
          <View
            style={{
              padding: 13,
              borderRadius: 14,
              backgroundColor: c.goldSurface,
              borderWidth: 1,
              borderColor: c.goldBorder,
            }}
          >
            <Txt bold>Royalty year anniversary · {dateLabel(royalty.anniversary)}</Txt>
            <Txt size={13} color={c.mutedForeground}>
              Annual progress renews; lifetime visits, levels and reward balances remain.
            </Txt>
          </View>
          {timeline.length ? (
            timeline.map((item) => (
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
            ))
          ) : (
            <Txt color={c.mutedForeground}>
              Your Royalty history will appear after your first qualifying visit or reward.
            </Txt>
          )}
        </View>
      )}
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
