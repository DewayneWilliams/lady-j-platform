import { serviceDurationLabel } from "@/lib/salon/duration";
import CatalogGallery from "./CatalogGallery";
import ServiceCategories from "./ServiceCategories";
import React, { useState } from "react";
import { View, Pressable, TextInput, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { money, servicePriceLabel, dateLabel, timeLabel } from "@/lib/salon/types";
import { salonIdentity } from "@/lib/salon/identity";
import Shell, { useNav } from "./Shell";
import { Txt, Action, Heading, Tag, LinkText, Card, Empty, useColors } from "./ui";
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
    [category, setCategory] = useState("Hair");
  const [page, setPage] = useState(0);
  const desktop = width > 850;
  const filtered = s.services.filter(
    (v) =>
      v.category === category &&
      `${v.name} ${v.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages - 1);
  return (
    <Shell scrollRevision={currentPage}>
      <Heading sub="Expert hands. Thoughtful treatments. Care that feels like you.">
        Find your kind of beautiful
      </Heading>
      {!s.session && !s.testMode && (
        <Card
          style={{
            gap: 12,
            marginBottom: 22,
            backgroundColor: c.goldSurface,
            borderColor: c.goldBorder,
          }}
          className={"h-64 lg:mb-0 lg:pb-0"}
        >
          <Txt size={16} color={c.mutedForeground} className={""}>
            Create a free account when you are ready to choose a time and book.
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
      <View style={{ height: 6 }} />
      <Search
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
        placeholder="Search services or treatments"
      />
      <ServiceCategories
        includeAll={false}
        interactiveArrows
        value={category}
        onChange={(value) => {
          setCategory(value);
          setPage(0);
        }}
      />
      <View accessibilityLiveRegion="polite" style={{ marginBottom: 18 }}>
        <Txt color={c.mutedForeground}>
          {filtered.length} {filtered.length === 1 ? "service" : "services"} found
        </Txt>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {filtered.slice(currentPage * 12, currentPage * 12 + 12).map((v) => (
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
            <CatalogGallery photos={v.photos} cover={v.image} height={180} />
            <View style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag>{v.category}</Tag>
                {v.is_add_on && <Tag>Add-on</Tag>}
              </View>
              <Txt serif size={25}>
                {v.name}
              </Txt>
              <Txt size={13} color={c.mutedForeground}>
                {v.is_demo &&
                /demo|sample|illustrative|demonstration|fictional/i.test(v.description)
                  ? "Ask the salon for details."
                  : v.description}
              </Txt>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Txt size={13} color={c.mutedForeground}>
                  {serviceDurationLabel(v)}
                </Txt>
                <Txt bold size={16}>
                  {servicePriceLabel(v)}
                </Txt>
              </View>
              {v.bookable === false && (
                <Txt size={12} color={c.mutedForeground}>
                  {v.is_add_on ? "Available as an add-on" : "Contact the salon to book"}
                </Txt>
              )}
            </View>
          </Card>
        ))}
      </View>
      {!filtered.length && (
        <Empty
          title="No matching services"
          body="Try another name or clear your filters."
          action={
            <Action
              label="Clear filters"
              secondary
              onPress={() => {
                setQuery("");
                setCategory("Hair");
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
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
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
  const c = useColors();
  return (
    <Shell>
      <View
        style={{
          width: "100%",
          maxWidth: 820,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 48,
          paddingHorizontal: 8,
          gap: 24,
        }}
      >
        <Txt serif size={38} style={{ textAlign: "center", lineHeight: 47 }}>
          Lady J International Beauty Academy
        </Txt>
        <Txt size={17} color={c.mutedForeground} style={{ textAlign: "center", lineHeight: 29 }}>
          Your passion for beauty deserves more than a dream—it deserves a future. At Lady J
          International Beauty Academy, we help aspiring beauty professionals develop the skills,
          confidence, and knowledge to turn their talent into opportunity. Through structured
          cosmetology curricula, engaging online education, hands-on training, and in-person
          workshops, students experience a supportive learning environment designed to build
          professional expertise and prepare them for real-world opportunities in the beauty
          industry.
        </Txt>
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
          {v.is_demo && <Tag>Sample data</Tag>}
          <Txt serif size={39} style={{ lineHeight: 47 }}>
            {v.name}
          </Txt>
          <Txt size={24}>{money(v.price)}</Txt>
          <Txt color={c.mutedForeground}>
            {v.is_demo && /demo|sample|illustrative|demonstration|fictional/i.test(v.description)
              ? "Ask the salon for details."
              : v.description}
          </Txt>
          {kind === "product" ? (
            <>
              <Txt size={13}>{"stock" in v ? v.stock : 0} available · Pickup or delivery</Txt>
              <Action
                label={s.session ? "Add to bag" : "Create free account"}
                icon="ShoppingBag"
                disabled={"stock" in v && (s.cart[v.id] || 0) >= v.stock}
                onPress={() => {
                  if (!s.session && !s.testMode) {
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
              Bank transfers are verified by the salon owner. Card payments are not connected.
            </Txt>
          </Card>
        </View>
      </View>
    </Shell>
  );
}
