import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { money, type Product } from "@/lib/salon/types";
import FavoriteButton from "./FavoriteButton";
import { ButtonLabel, Photo, Txt, useColors } from "./ui";

export default function ProductCard({ product, onPress, style }: { product: Product; onPress?: () => void; style?: ViewStyle }) {
  const c = useColors();
  const description = product.is_demo && /demo|sample|illustrative|demonstration|fictional/i.test(product.description) ? "Ask the salon for details." : product.description;
  return <Pressable accessibilityRole={onPress ? "button" : undefined} onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, height: 88, overflow: "hidden", borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, opacity: pressed ? 0.86 : 1 }, style]}>
    <Photo name={product.image} style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: c.muted }} />
    <View style={{ flex: 1, minWidth: 0, gap: 1, paddingRight: 34 }}>
      <ButtonLabel singleLine size={16}>{product.name}</ButtonLabel>
      <Txt size={12} color={c.mutedForeground} numberOfLines={1}>{description}</Txt>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Txt size={12} color={c.mutedForeground} numberOfLines={1} style={{ flex: 1 }}>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</Txt>
        <Txt size={12} bold numberOfLines={1}>{money(product.price)}</Txt>
      </View>
    </View>
    <View style={{ position: "absolute", right: 6, bottom: 5 }}><FavoriteButton kind="product" itemId={product.id} /></View>
  </Pressable>;
}
