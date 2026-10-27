import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { serviceDurationLabel } from "@/lib/salon/duration";
import type { Service } from "@/lib/salon/types";
import { servicePriceLabel } from "@/lib/salon/types";
import FavoriteButton from "./FavoriteButton";
import { ButtonLabel, Photo, Txt, useColors } from "./ui";

export default function ServiceCard({
  service,
  selected,
  onPress,
  showFavorite = false,
  style,
}: {
  service: Service;
  selected?: boolean;
  onPress?: () => void;
  showFavorite?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const description =
    service.is_demo && /demo|sample|illustrative|demonstration|fictional/i.test(service.description)
      ? "Ask the salon for details."
      : service.description;

  return (
    <Pressable
      accessibilityRole={onPress ? "checkbox" : undefined}
      accessibilityState={onPress ? { checked: Boolean(selected) } : undefined}
      disabled={false}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          height: 88,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: selected ? c.primary : c.border,
          borderRadius: 12,
          backgroundColor: c.card,
          opacity: pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <Photo
        name={service.image}
        style={{ width: 88, minWidth: 88, maxWidth: 88, height: 88, flexGrow: 0, flexShrink: 0, borderRadius: 10, backgroundColor: c.muted }}
      />
      <View style={{ flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: "center", marginLeft: 10, gap: 1, paddingRight: showFavorite ? 34 : 10 }}>
        <ButtonLabel singleLine size={16}>
          {service.name}
        </ButtonLabel>
        <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
          {description}
        </Txt>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Txt size={12} color={c.mutedForeground} numberOfLines={1} style={{ flex: 1 }}>{serviceDurationLabel(service)}</Txt>
          <Txt size={12} bold numberOfLines={1}>{servicePriceLabel(service)}</Txt>
        </View>
      </View>
      {showFavorite ? (
        <View style={{ position: "absolute", right: 6, bottom: 5 }}><FavoriteButton kind="service" itemId={service.id} /></View>
      ) : onPress ? (
        <Icon
          name={selected ? "CircleCheck" : "CirclePlus"}
          size={24}
          color={selected ? c.brandAccent : c.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}
