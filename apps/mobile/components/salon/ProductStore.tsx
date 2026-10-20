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

export default function ProductStore() {
  const s = useSalon();
  const c = useColors();
  const go = useNav();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All brands");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("Name A–Z");
  const [page, setPage] = useState(0);
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
  const bagCount = Object.values(s.cart).reduce((total, quantity) => total + quantity, 0);
  return (
    <Shell wide scrollRevision={currentPage}>
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
        <Action
          label={"Bag (" + bagCount + ")"}
          icon="ShoppingBag"
          secondary
          onPress={() => go("bag")}
        />
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
        {!s.session && (
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
      <Txt size={18} bold style={{ marginBottom: 12 }}>
        Shop by brand
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 24 }}>
        {[
          "All brands",
          ...new Set([...productBrands, ...s.products.map((v) => v.brand || "").filter(Boolean)]),
        ].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={brand === value}
            onPress={() => {
              setBrand(value);
              setPage(0);
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 24 }}>
        {[
          "All products",
          ...new Set([
            "Shampoo",
            "Conditioner",
            "Treatments",
            "Styling",
            ...s.products.map((v) => v.category),
          ]),
        ].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => {
              setCategory(value);
              setPage(0);
            }}
          />
        ))}
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
        {filtered.slice(currentPage * 24, currentPage * 24 + 24).map((v) => (
          <Card
            key={v.id}
            style={{
              width: width > 1100 ? "23%" : width > 650 ? "47%" : "100%",
              flexGrow: 1,
              maxWidth: width > 1100 ? "25%" : width > 650 ? "49%" : undefined,
              padding: 16,
              gap: 14,
            }}
          >
            <CatalogGallery photos={v.photos} cover={v.image} height={220} />
            <Txt size={12} bold color={c.secondaryForeground}>
              {v.brand || "Lady J collection"}
            </Txt>
            <Pressable accessibilityRole="button" onPress={() => go("product", { id: v.id })}>
              <Txt size={18} bold>
                {v.name}
              </Txt>
            </Pressable>

            <Txt size={20} bold>
              {money(v.price)}
            </Txt>
            <Txt size={13} color={c.mutedForeground}>
              {v.stock > 0 ? "Available for pickup or delivery" : "Currently out of stock"}
            </Txt>
            <Action
              label={s.cart[v.id] ? "In bag (" + s.cart[v.id] + ") · Add" : "Add to bag"}
              icon="Plus"
              disabled={v.stock <= 0 || (s.cart[v.id] || 0) >= v.stock}
              style={{ alignSelf: "stretch", paddingHorizontal: 12 }}
              onPress={() => {
                if (!s.session) {
                  go("register", { next: "product?id=" + v.id });
                  return;
                }
                s.setCart((old) => ({ ...old, [v.id]: (old[v.id] || 0) + 1 }));
                s.notify(v.name + " added to your bag.");
              }}
            />
            <LinkText onPress={() => go("product", { id: v.id })}>View details</LinkText>
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
