import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { money, type Product } from "@/lib/salon/types";
import FavoriteButton from "./FavoriteButton";
import { Photo, Txt, useColors } from "./ui";

export default function ProductCard({
  product,
  onPress,
  style,
}: {
  product: Product;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const c = useColors();
  const description =
    product.is_demo && /demo|sample|illustrative|demonstration|fictional/i.test(product.description)
      ? "Ask the salon for details."
      : product.description;
  return (
    <View
      style={[
        {
          height: 88,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          backgroundColor: c.card,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          height: 88,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: pressed ? 0.86 : 1,
        })}
      >
        <Photo
          name={product.image}
          style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: c.muted }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 1, paddingRight: 38 }}>
          <Txt bold size={16} numberOfLines={1} ellipsizeMode="tail">
            {product.name}
          </Txt>
          <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
            {description}
          </Txt>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Txt size={12} color={c.mutedForeground} numberOfLines={1} style={{ flex: 1 }}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Txt>
            <Txt size={12} bold numberOfLines={1}>
              {money(product.price)}
            </Txt>
          </View>
        </View>
      </Pressable>
      <View style={{ position: "absolute", right: 4, bottom: 4 }}>
        <FavoriteButton compact kind="product" itemId={product.id} />
      </View>
    </View>
  );
}
