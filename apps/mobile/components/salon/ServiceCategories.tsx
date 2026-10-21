import React, { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { serviceCategories } from "@/lib/salon/categories";
import { Chip, Txt, useColors } from "./ui";
export default function ServiceCategories({
  value,
  onChange,
  booking = false,
  includeAll = true,
  interactiveArrows = false,
}: {
  value: string;
  onChange: (value: string) => void;
  booking?: boolean;
  includeAll?: boolean;
  interactiveArrows?: boolean;
}) {
  const c = useColors();
  const scroll = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const categories = serviceCategories().filter((category) => includeAll || category !== "All");
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const slide = (direction: -1 | 1) => {
    const distance = Math.max(180, viewportWidth * 0.72);
    const next = Math.max(0, Math.min(maxOffset, offset + direction * distance));
    setOffset(next);
    scroll.current?.scrollTo({ x: next, animated: true });
  };
  return (
    <View style={{ minWidth: 0, marginBottom: booking ? 12 : 18 }}>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Service Categories"
        directionalLockEnabled
        nestedScrollEnabled
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        style={{ flexGrow: 0, minWidth: 0 }}
        contentContainerStyle={{ gap: booking ? 8 : 9, paddingBottom: 8, paddingHorizontal: 2 }}
      >
        {categories.map((category) => (
          <View key={category} style={{ flexShrink: 0 }}>
            <Chip
              label={category}
              selected={value === category}
              onPress={() => onChange(category)}
            />
          </View>
        ))}
      </ScrollView>
      {interactiveArrows ? (
        <View
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 2,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Slide service categories left"
            disabled={offset <= 1}
            onPress={() => slide(-1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: c.goldBorder,
              backgroundColor: c.goldSurface,
              opacity: offset <= 1 ? 0.35 : pressed ? 0.65 : 1,
            })}
          >
            <Icon name="ChevronLeft" size={25} color={c.brandAccent} />
          </Pressable>
          <Txt
            size={14}
            bold
            color={c.mutedForeground}
            style={{ textAlign: "center", letterSpacing: 0.15 }}
          >
            Slide to Explore
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Slide service categories right"
            disabled={maxOffset <= 1 || offset >= maxOffset - 1}
            onPress={() => slide(1)}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: c.goldBorder,
              backgroundColor: c.goldSurface,
              opacity: maxOffset <= 1 || offset >= maxOffset - 1 ? 0.35 : pressed ? 0.65 : 1,
            })}
          >
            <Icon name="ChevronRight" size={25} color={c.brandAccent} />
          </Pressable>
        </View>
      ) : (
        <Txt
          size={11}
          color={c.mutedForeground}
          style={{ textAlign: "center", letterSpacing: 0.2, marginTop: 2 }}
        >
          ← Slide to Explore →
        </Txt>
      )}
    </View>
  );
}
