import React, { useState } from "react";
import { View, Pressable, TextInput, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { productBrands } from "@/lib/salon/categories";
import { fonts } from "@/lib/salon/design";
import Shell, { useNav } from "./Shell";
import { Action, ButtonLabel, Card, Chip, Empty, LinkText, Tag, Txt, useColors } from "./ui";
import ProductCard from "./ProductCard";

export default function ProductStore() {
  const s = useSalon();
  const c = useColors();
  const go = useNav();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All brands");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("Name A–Z");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const desktop = width > 850;
  const filtered = s.products
    .filter(
      (v) =>
        (brand === "All brands" || v.brand === brand) &&
        (category === "All products" || v.category === category) &&
        (v.name + " " + (v.brand || "") + " " + v.description)
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      s.session && sort === "Price low–high"
        ? a.price - b.price
        : s.session && sort === "Price high–low"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 24));
  const currentPage = Math.min(page, pages - 1);
  return (
    <Shell
      wide
      scrollRevision={currentPage}
      headerAction={{ label: "EXPLORE PRODUCTS", onPress: () => go("boutique") }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.card,
          paddingHorizontal: 16,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Icon name="Search" size={22} color={c.mutedForeground} />
        <TextInput
          accessibilityLabel="Search beauty products or brands"
          placeholder="Search products, brands or your next essential"
          placeholderTextColor={c.mutedForeground}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setPage(0);
          }}
          style={{
            flex: 1,
            minHeight: 56,
            minWidth: 0,
            fontFamily: fonts.body,
            fontSize: 16,
            color: c.foreground,
          }}
        />
      </View>
      <Card
        style={{
          backgroundColor: c.goldSurface,
          borderColor: c.goldBorder,
          padding: width > 800 ? 36 : 24,
          gap: 14,
          marginBottom: 28,
          paddingTop: 8,
          height: 95,
        }}
      >
        <Tag gold>Sample data</Tag>
        <Txt serif size={width > 800 ? 38 : 28}>
          Your salon shelf, at home.
        </Txt>
        <Txt color={c.mutedForeground} style={{ maxWidth: 620 }}>
          Shop by brand and find your daily essentials.
        </Txt>
        {!s.session && !s.testMode && (
          <LinkText onPress={() => go("register", { next: "boutique" })}>
            Create a free account to shop
          </LinkText>
        )}
      </Card>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter products"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen((value) => !value)}
          style={({ pressed }) => ({
            minHeight: 46,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            maxWidth: "100%",
            minWidth: 0,
            flexShrink: 1,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-start",
            backgroundColor: c.card,
            borderColor: c.border,
            borderWidth: 1,
            opacity: pressed ? 0.86 : 1,
          })}
        >
          <Icon name="SlidersHorizontal" size={22} color={c.foreground} />
          <ButtonLabel size={18} color={c.foreground}>
            Filter{brand !== "All brands" || category !== "All products" ? " · Active" : ""}
          </ButtonLabel>
        </Pressable>
        <Txt color={c.mutedForeground} style={{ marginLeft: "auto", textAlign: "right" }}>
          {filtered.length} products
        </Txt>
      </View>
      {filtersOpen && (
        <Card style={{ gap: 18, marginBottom: 24, padding: 18 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Txt size={20} bold>
              Filter products
            </Txt>
            <LinkText
              onPress={() => {
                setBrand("All brands");
                setCategory("All products");
                setSort("Name A–Z");
                setPage(0);
              }}
            >
              Clear all
            </LinkText>
          </View>
          <View style={{ gap: 9 }}>
            <Txt bold>Brand</Txt>
            <View style={{ gap: 7 }}>
              {[
                "All brands",
                ...new Set([
                  ...productBrands,
                  ...s.products.map((v) => v.brand || "").filter(Boolean),
                ]),
              ].map((value) => {
                const count = s.products.filter(
                  (product) =>
                    (value === "All brands" || product.brand === value) &&
                    (category === "All products" || product.category === category) &&
                    `${product.name} ${product.brand || ""} ${product.description}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ).length;
                const selected = brand === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setBrand(value);
                      setPage(0);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? c.goldBorder : c.border,
                      backgroundColor: selected ? c.goldSurface : c.background,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Txt bold={selected} style={{ flex: 1, textAlign: "left" }}>
                      {value}
                    </Txt>
                    <Txt color={c.mutedForeground} style={{ textAlign: "right" }}>
                      {count}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 9 }}>
            <Txt bold>Category</Txt>
            <View style={{ gap: 7 }}>
              {[
                "All products",
                ...new Set([
                  "Shampoo",
                  "Conditioner",
                  "Treatments",
                  "Styling",
                  ...s.products.map((v) => v.category),
                ]),
              ].map((value) => {
                const count = s.products.filter(
                  (product) =>
                    (brand === "All brands" || product.brand === brand) &&
                    (value === "All products" || product.category === value) &&
                    `${product.name} ${product.brand || ""} ${product.description}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ).length;
                const selected = category === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setCategory(value);
                      setPage(0);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? c.goldBorder : c.border,
                      backgroundColor: selected ? c.goldSurface : c.background,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Txt bold={selected} style={{ flex: 1, textAlign: "left" }}>
                      {value}
                    </Txt>
                    <Txt color={c.mutedForeground} style={{ textAlign: "right" }}>
                      {count}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 9 }}>
            <Txt bold>Sort by</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Name A–Z", "Price low–high", "Price high–low"].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={sort === value}
                  onPress={() => {
                    setSort(value);
                    setPage(0);
                  }}
                />
              ))}
            </View>
          </View>
          <Action
            label={`Show ${filtered.length} products`}
            onPress={() => setFiltersOpen(false)}
            style={{ alignSelf: "stretch" }}
          />
        </Card>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        {filtered.slice(currentPage * 24, currentPage * 24 + 24).map((v) => (
          <ProductCard
            key={v.id}
            product={v}
            onPress={() => go("product", { id: v.id })}
            style={{
              width: desktop ? "48%" : "100%",
              maxWidth: desktop ? "50%" : undefined,
            }}
          />
        ))}
      </View>
      {!filtered.length && (
        <Empty
          title="No products match just yet"
          body="Try another brand, category or search term."
          action={
            <Action
              label="Clear filters"
              secondary
              onPress={() => {
                setBrand("All brands");
                setCategory("All products");
                setQuery("");
                setPage(0);
              }}
            />
          }
        />
      )}
      {pages > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            marginTop: 28,
          }}
        >
          <Action
            label="Previous"
            secondary
            disabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
          />
          <Txt>
            {currentPage + 1} / {pages}
          </Txt>
          <Action
            label="Next"
            secondary
            disabled={currentPage === pages - 1}
            onPress={() => setPage(currentPage + 1)}
          />
        </View>
      )}
    </Shell>
  );
}
