import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { AttentionItem } from "@/lib/salon/ownerAssistant";
import { Card, Txt, ButtonLabel, useColors } from "../ui";
import AttentionCard from "./AttentionCard";
import { OwnerText } from "./OwnerUI";
export default function DailyBriefing({
  items,
  onOpen,
}: {
  items: AttentionItem[];
  onOpen: (item: AttentionItem) => void;
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const content = (
    <View style={{ gap: 4 }}>
      <OwnerText size={25} bold>
        {items.length ? "Needs attention" : "You’re up to date"}
      </OwnerText>
      {!items.length && (
        <OwnerText muted>
          No payments, balances, orders or stock alerts need your attention in the loaded records.
        </OwnerText>
      )}
      {(expanded ? items : items.slice(0, 3)).map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.count + " · " + item.title + ". " + item.detail}
          onPress={() => onOpen(item)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            minHeight: 68,
            paddingVertical: 12,
            opacity: pressed ? 0.98 : 1,
            borderBottomWidth: 1,
            borderColor: c.border,
          })}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.brandAccentSurface,
            }}
          >
            <Txt size={20} bold color={c.brandAccent}>
              {item.count}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <OwnerText bold>{item.title}</OwnerText>
            <OwnerText size={17} muted>
              {item.detail}
            </OwnerText>
          </View>
          <Icon name="ChevronRight" size={20} color={c.mutedForeground} />
        </Pressable>
      ))}
      {items.length > 3 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(!expanded)}
          style={{
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        >
          <ButtonLabel size={20}>
            {expanded ? "Show less" : "Show " + (items.length - 3) + " more"}
          </ButtonLabel>
        </Pressable>
      )}
    </View>
  );
  return items.length ? (
    <AttentionCard urgent>{content}</AttentionCard>
  ) : (
    <Card style={{ padding: 26 }}>{content}</Card>
  );
}
