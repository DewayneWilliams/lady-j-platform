import React from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { type AttentionItem } from "@/lib/salon/ownerAssistant";
import { Card, Txt, useColors } from "../ui";
import AttentionCard from "./AttentionCard";

export default function DailyBriefing({
  items,
  onOpen,
}: {
  items: AttentionItem[];
  onOpen: (item: AttentionItem) => void;
}) {
  const c = useColors();
  const notificationCount = items.reduce((total, item) => total + item.count, 0);
  const summary = items.length
    ? `Needs Attention · ${items.map((item) => `${item.count} ${item.title}`).join(" · ")}`
    : "You’re Up to Date · Nothing needs your attention";
  const row = (
    <Pressable
      accessibilityRole={items.length ? "button" : undefined}
      accessibilityLabel={summary}
      disabled={!items.length}
      onPress={() => items[0] && onOpen(items[0])}
      style={({ pressed }) => ({
        minHeight: 64,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <View
        style={{
          minWidth: 54,
          height: 34,
          borderRadius: 10,
          paddingHorizontal: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: items.length ? c.brandAccentSurface : c.muted,
        }}
      >
        <Icon
          name={items.length ? "Bell" : "CircleCheck"}
          size={18}
          color={items.length ? c.brandAccent : c.mutedForeground}
        />
        <Txt size={17} bold color={items.length ? c.brandAccent : c.mutedForeground}>
          {notificationCount}
        </Txt>
      </View>
      <Txt
        bold={!!items.length}
        size={16}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        color={items.length ? c.foreground : c.mutedForeground}
        style={{ flex: 1, lineHeight: 21 }}
      >
        {summary}
      </Txt>
    </Pressable>
  );
  return items.length ? (
    <AttentionCard urgent>{row}</AttentionCard>
  ) : (
    <Card style={{ paddingHorizontal: 12, paddingVertical: 6 }}>{row}</Card>
  );
}
