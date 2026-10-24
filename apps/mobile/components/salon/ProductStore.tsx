import React, { useState } from "react";
import { View, Pressable, TextInput, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { productBrands } from "@/lib/salon/categories";
import { money } from "@/lib/salon/types";
import { fonts } from "@/lib/salon/design";
import Shell, { useNav } from "./Shell";
import { Action, Card, Chip, Empty, LinkText, Tag, Txt, useColors } from "./ui";
import CatalogGallery from "./CatalogGallery";
import FavoriteButton from "./FavoriteButton";

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
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <View style={{ flex: 1, minWidth: 200 }}>
          <Txt serif size={32}>
            The Lady J beauty store
          </Txt>
          <Txt color={c.mutedForeground} style={{ marginTop: 8 }}>
            Professional care for your everyday routine.
          </Txt>
        </View>
        <Action label="Buy Products" icon="ShoppingBag" inverted onPress={() => go("bag")} />
      </View>
      <Card
        style={{
          backgroundColor: c.goldSurface,
          borderColor: c.goldBorder,
          padding: width > 800 ? 36 : 24,
          gap: 14,
          marginBottom: 28,
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
        <Txt color={c.mutedForeground}>{filtered.length} products</Txt>
        <Action
          label={`Filter${brand !== "All brands" || category !== "All products" ? " · Active" : ""}`}
          icon="SlidersHorizontal"
          secondary
          onPress={() => setFiltersOpen((value) => !value)}
          style={{ minHeight: 46, paddingVertical: 8 }}
        />
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {filtered.slice(currentPage * 24, currentPage * 24 + 24).map((v) => (
          <Card
            key={v.id}
            style={{
              padding: 0,
              overflow: "hidden",
              width: desktop ? "31%" : "100%",
              maxWidth: desktop ? "33%" : undefined,
            }}
          >
            <CatalogGallery photos={v.photos} cover={v.image} height={180} />
            <View style={{ padding: 16, gap: 8, flex: 1 }}>
              <Txt size={12} bold color={c.secondaryForeground}>
                {v.brand || "Lady J collection"}
              </Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  style={{ flex: 1 }}
                  accessibilityRole="button"
                  onPress={() => go("product", { id: v.id })}
                >
                  <Txt serif size={25}>
                    {v.name}
                  </Txt>
                </Pressable>
                <FavoriteButton kind="product" itemId={v.id} />
              </View>
              <Txt size={13} color={c.mutedForeground}>
                {v.is_demo &&
                /demo|sample|illustrative|demonstration|fictional/i.test(v.description)
                  ? "Ask the salon for details."
                  : v.description}
              </Txt>
              <View style={{ marginTop: "auto", gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Txt size={13} color={c.mutedForeground}>
                    {v.stock > 0 ? "Pickup or delivery" : "Out of stock"}
                  </Txt>
                  <Txt size={16} bold>
                    {money(v.price)}
                  </Txt>
                </View>
                <Action
                  label={s.cart[v.id] ? "In bag (" + s.cart[v.id] + ") · Add" : "Add to bag"}
                  icon="Plus"
                  disabled={v.stock <= 0 || (s.cart[v.id] || 0) >= v.stock}
                  style={{ alignSelf: "stretch", paddingHorizontal: 12 }}
                  onPress={() => {
                    if (!s.session && !s.testMode) {
                      go("register", { next: "product?id=" + v.id });
                      return;
                    }
                    s.setCart((old) => ({ ...old, [v.id]: (old[v.id] || 0) + 1 }));
                    s.notify(v.name + " added to your bag.");
                  }}
                />
                <LinkText onPress={() => go("product", { id: v.id })}>View details</LinkText>
              </View>
            </View>
          </Card>
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
