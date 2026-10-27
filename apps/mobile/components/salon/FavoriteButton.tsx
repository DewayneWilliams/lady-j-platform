import React from "react";
import { Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import type { Favorite } from "@/lib/salon/types";
import { useNav } from "./Shell";
import { useColors } from "./ui";

export default function FavoriteButton({
  kind,
  itemId,
  compact = false,
}: {
  kind: Favorite["kind"];
  itemId: string;
  compact?: boolean;
}) {
  const s = useSalon();
  const go = useNav();
  const c = useColors();
  const saved = s.favorites.some(
    (favorite) => favorite.kind === kind && favorite.item_id === itemId,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from favorites" : "Save to favorites"}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={(event) => {
        event.stopPropagation();
        if (!s.session && !s.testMode) {
          go("login", {
            next:
              kind === "service"
                ? "services"
                : kind === "product"
                  ? `product?id=${itemId}`
                  : `workshop?id=${itemId}`,
          });
          return;
        }
        void s
          .toggleFavorite(kind, itemId)
          .catch((reason: unknown) =>
            s.notify(reason instanceof Error ? reason.message : "Unable to update favorites."),
          );
      }}
      style={({ pressed }) => ({
        width: compact ? 32 : 44,
        height: compact ? 32 : 44,
        borderRadius: compact ? 16 : 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: saved ? c.brandAccent : c.border,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon
        name="Heart"
        size={compact ? 18 : 22}
        color={saved ? c.brandAccent : c.mutedForeground}
        fill={saved ? c.brandAccent : "transparent"}
      />
    </Pressable>
  );
}
