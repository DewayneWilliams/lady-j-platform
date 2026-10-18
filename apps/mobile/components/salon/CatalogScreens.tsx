import { formatDuration } from "@/lib/salon/duration";
import CatalogGallery from "./CatalogGallery";
import { serviceCategories } from "@/lib/salon/categories";
import React, { useState } from "react";
import { View, Pressable, ScrollView, TextInput, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { money, dateLabel, timeLabel } from "@/lib/salon/types";
import { salonIdentity } from "@/lib/salon/identity";
import Shell, { useNav } from "./Shell";
import {
  Txt,
  Action,
  Heading,
  Photo,
  Tag,
  LinkText,
  Chip,
  Card,
  Empty,
  useColors,
  shared,
} from "./ui";
import { fonts } from "@/lib/salon/design";
export function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: c.card,
        marginBottom: 18,
      }}
    >
      <Icon name="Search" size={19} color={c.mutedForeground} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        value={value}
        onChangeText={onChange}
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: c.foreground,
          flex: 1,
          minHeight: 52,
        }}
      />
      {!!value && (
        <Pressable
          accessibilityLabel="Clear search"
          onPress={() => onChange("")}
          style={{ padding: 10 }}
        >
          <Icon name="X" size={18} color={c.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}
export function ServicesScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  const desktop = width > 850;
  const filtered = s.services.filter(
    (v) =>
      (category === "All" || v.category === category) &&
      `${v.name} ${v.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Shell>
      <Heading sub="Expert hands. Thoughtful rituals. Care that feels like you.">
        Find your kind of beautiful
      </Heading>
      {!s.session && (
        <Card
          style={{
            gap: 12,
            marginBottom: 22,
            backgroundColor: c.goldSurface,
            borderColor: c.goldBorder,
          }}
        >
          <Txt size={20} bold>
            Your free account unlocks prices & booking
          </Txt>
          <Txt size={16} color={c.mutedForeground}>
            Browse our care menu. Create a free account to see prices and choose an appointment.
          </Txt>
          <Action
            label="Create free account"
            gold
            onPress={() => go("register", { next: "services" })}
          />
          <LinkText onPress={() => go("login", { next: "services" })}>
            Already a client? Sign in
          </LinkText>
        </Card>
      )}
      <Tag>Demonstration catalog · Sample TTD pricing</Tag>
      <View style={{ height: 22 }} />
      <Search value={query} onChange={setQuery} placeholder="Search services or treatments" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 9, paddingBottom: 24 }}
      >
        {serviceCategories(s.services.map((v) => v.category)).map((v) => (
          <Chip key={v} label={v} selected={category === v} onPress={() => setCategory(v)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
        {filtered.map((v) => (
          <Card
            key={v.id}
            style={{
              padding: 0,
              overflow: "hidden",
              width: desktop ? "31%" : "100%",
              flexGrow: 1,
              maxWidth: desktop ? "33%" : undefined,
            }}
          >
            <CatalogGallery photos={v.photos} cover={v.image} height={220} />
            <View style={{ padding: 21, gap: 10 }}>
              <Tag>{v.category}</Tag>
              <Txt serif size={25}>
                {v.name}
              </Txt>
              <Txt size={13} color={c.mutedForeground} style={{ minHeight: 60 }}>
                {v.description}
              </Txt>
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 8 }}
              >
                <Txt size={13} color={c.mutedForeground}>
                  {formatDuration(v.duration)}
                </Txt>
                <Txt bold size={16}>
                  {s.session ? money(v.price) : "Price after sign-in"}
                </Txt>
              </View>
              <Action
                label="Book this service"
                onPress={() => {
                  s.setSelected([v.id]);
                  go("booking");
                }}
                style={{ alignSelf: "stretch" }}
              />
            </View>
          </Card>
        ))}
      </View>
      {!filtered.length && (
        <Empty
          title="A little more specific?"
          body="Try a different service name or choose another category."
        />
      )}
      <View style={{ height: 24 }} />
      <Card style={{ backgroundColor: c.secondary }}>
        <Txt serif size={24}>
          Not sure where to start?
        </Txt>
        <Txt color={c.mutedForeground} style={{ marginTop: 8, marginBottom: 12 }}>
          Bring an inspiration photo to your booking. Your final treatment and quote are always
          confirmed by a professional.
        </Txt>
        <LinkText onPress={() => go("booking")}>Explore your options ↗</LinkText>
      </Card>
    </Shell>
  );
}
export function WorkshopsScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const [filter, setFilter] = useState("All");
  return (
    <Shell>
      <View
        style={{
          borderWidth: 1,
          borderColor: c.goldBorder,
          backgroundColor: c.goldSurface,
          borderRadius: 20,
          overflow: "hidden",
          flexDirection: width > 800 ? "row" : "column",
          marginBottom: 32,
        }}
      >
        <View
          style={{ flex: 1.2, padding: width > 800 ? 38 : 26, gap: 17, justifyContent: "center" }}
        >
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Icon name="GraduationCap" size={24} color={c.warning} />
            <Txt size={14} bold color={c.warning}>
              Professional beauty education
            </Txt>
          </View>
          <Txt serif size={width > 800 ? 43 : 34} style={{ lineHeight: width > 800 ? 49 : 40 }}>
            {salonIdentity.academyName}
          </Txt>
          <Txt size={16} color={c.mutedForeground}>
            Refine your artistry. Build your confidence. Explore live and recorded beauty workshops
            with Lady J.
          </Txt>
          <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
            <Txt size={13} color={c.warning}>
              Online workshops
            </Txt>
            <Txt size={13} color={c.warning}>
              In-person workshops
            </Txt>
          </View>
        </View>
        <Photo
          name="workshop"
          style={{
            flex: width > 800 ? 1 : undefined,
            width: width > 800 ? undefined : "100%",
            height: width > 800 ? 340 : 210,
          }}
        />
      </View>
      <Heading sub="Choose a workshop and take your next step in beauty.">
        Academy workshops
      </Heading>
      <View style={[shared.row, { marginBottom: 23 }]}>
        {["All", "Online", "In person"].map((v) => (
          <Chip label={v} key={v} selected={filter === v} onPress={() => setFilter(v)} />
        ))}
      </View>
      <Tag>Demonstration workshops · Sample dates and prices</Tag>
      <View style={{ height: 22 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
        {s.workshops
          .filter((v) => filter === "All" || filter === v.format)
          .map((v) => (
            <View key={v.id} style={{ width: width > 800 ? "48%" : "100%", flexGrow: 1 }}>
              <CatalogGallery photos={v.photos} cover={v.image} height={290} />
              <View style={{ paddingVertical: 20, gap: 10 }}>
                <Tag gold>{v.format === "Online" ? "Online workshop" : "In-person workshop"}</Tag>
                <Txt serif size={30}>
                  {v.name}
                </Txt>
                <Txt color={c.mutedForeground} size={14}>
                  {v.description}
                </Txt>
                <Txt size={13}>
                  {v.starts_at
                    ? `${dateLabel(v.starts_at)} · ${timeLabel(v.starts_at)}`
                    : "Date to be announced"}
                </Txt>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Txt bold size={19}>
                    {s.session ? money(v.price) : "Free account to view price"}
                  </Txt>
                  <LinkText onPress={() => go("workshop", { id: v.id })}>View workshop ↗</LinkText>
                </View>
              </View>
            </View>
          ))}
      </View>
    </Shell>
  );
}
export { default as BoutiqueScreen } from "./ProductStore";
export function DetailScreen({ kind, id }: { kind: "product" | "workshop"; id: string }) {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const v =
    kind === "product" ? s.products.find((v) => v.id === id) : s.workshops.find((v) => v.id === id);
  if (!v)
    return (
      <Shell>
        <Empty
          title="We couldn’t find that"
          body="Explore the latest salon collection."
          action={
            <Action
              label="Browse"
              onPress={() => go(kind === "product" ? "boutique" : "workshops")}
            />
          }
        />
      </Shell>
    );
  return (
    <Shell>
      <LinkText onPress={() => go(kind === "product" ? "boutique" : "workshops")}>
        ‹ Back to {kind === "product" ? "the boutique" : "workshops"}
      </LinkText>
      <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 40, marginVertical: 22 }}>
        <View style={{ flex: 1 }}>
          <CatalogGallery photos={v.photos} cover={v.image} height={450} />
        </View>
        <View style={{ flex: 1, gap: 19, paddingTop: 10 }}>
          {v.is_demo && <Tag>Demo {kind} · Sample pricing and illustrative imagery</Tag>}
          <Txt serif size={39} style={{ lineHeight: 47 }}>
            {v.name}
          </Txt>
          <Txt size={24}>{s.session ? money(v.price) : "Free account to view price"}</Txt>
          <Txt color={c.mutedForeground}>{v.description}</Txt>
          {kind === "product" ? (
            <>
              <Txt size={13}>{"stock" in v ? v.stock : 0} available · Pickup or delivery</Txt>
              <Action
                label={s.session ? "Add to bag" : "Create free account"}
                icon="ShoppingBag"
                disabled={"stock" in v && (s.cart[v.id] || 0) >= v.stock}
                onPress={() => {
                  if (!s.session) {
                    go("register", { next: "product?id=" + v.id });
                    return;
                  }
                  s.setCart((old) => ({ ...old, [v.id]: (old[v.id] || 0) + 1 }));
                  s.notify("Added to your bag.");
                }}
              />
              <LinkText onPress={() => go("bag")}>View shopping bag ↗</LinkText>
            </>
          ) : (
            <>
              <Tag gold>{salonIdentity.academyName}</Tag>
              <Txt size={16}>Led by {"instructor" in v ? v.instructor : ""}</Txt>
              <Txt size={14}>
                {"starts_at" in v && v.starts_at
                  ? `${dateLabel(v.starts_at)} at ${timeLabel(v.starts_at)} (Trinidad & Tobago)`
                  : "Date to be announced"}
              </Txt>
              <Txt size={14}>
                {"capacity" in v ? v.capacity : ""} places · Materials and certificates when
                provided
              </Txt>
              <Action
                label="Register for this workshop"
                gold
                onPress={() => go("checkout", { kind: "workshop", id: v.id })}
              />
            </>
          )}
          <Card>
            <Txt size={13} color={c.mutedForeground}>
              Your payment is never marked complete without verification. Bank transfers are
              reviewed personally by the salon owner. Card checkout is currently a labeled
              simulation.
            </Txt>
          </Card>
        </View>
      </View>
    </Shell>
  );
}
