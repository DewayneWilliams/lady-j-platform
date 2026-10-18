import { formatDuration } from "@/lib/salon/duration";
import React from "react";
import { View, Pressable, useWindowDimensions, Linking } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { money } from "@/lib/salon/types";
import { salonIdentity } from "@/lib/salon/identity";
import CatalogGallery from "./CatalogGallery";
import { whatsappSupportUrl } from "@/lib/salon/whatsapp";
import Shell, { useNav } from "./Shell";
import { Txt, Action, Heading, Photo, Tag, Card, LinkText, useColors, shared } from "./ui";
export default function HomeScreen() {
  const c = useColors(),
    go = useNav(),
    { width } = useWindowDimensions(),
    s = useSalon();
  const desktop = width >= 850;
  const whatsappUrl = whatsappSupportUrl(s.settings?.whatsapp_phone);
  const specials = s.services.filter((v) => v.is_special && v.promote_on_home && v.active);
  const featured = [
    "Signature silk press",
    "The glow facial",
    "Signature manicure",
    "Signature lashes",
  ]
    .map((n) => s.services.find((v) => v.name === n))
    .filter(Boolean);
  return (
    <Shell wide>
      <View style={{ alignItems: "flex-end", gap: 8, marginBottom: 20 }}>
        <Action
          label="Have a Question?"
          style={{ alignSelf: "flex-end" }}
          icon="MessageCircle"
          secondary
          disabled={!whatsappUrl}
          onPress={() => {
            if (whatsappUrl)
              void Linking.openURL(whatsappUrl).catch(() => s.notify("Unable to open WhatsApp."));
          }}
        />
        {!whatsappUrl && (
          <Txt size={12} color={c.mutedForeground}>
            WhatsApp support is awaiting the salon’s number.
          </Txt>
        )}
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: c.goldBorder,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: c.secondary,
          flexDirection: desktop ? "row" : "column",
          minHeight: desktop ? 450 : 0,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flex: desktop ? 1.04 : undefined,
            padding: desktop ? 48 : 28,
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <View style={[shared.row, { gap: 8, marginBottom: 20 }]}>
            <View style={{ height: 1, width: 26, backgroundColor: c.tertiary }} />
            <Txt size={12} color={c.secondaryForeground}>
              Beauty. Wellness. You.
            </Txt>
          </View>
          <Txt
            serif
            size={desktop ? 48 : 36}
            style={{ lineHeight: desktop ? 58 : 44, letterSpacing: -1.2, marginBottom: 19 }}
          >
            Your time.{`\n`}Beautifully spent.
          </Txt>
          <Txt
            size={16}
            color={c.mutedForeground}
            style={{ lineHeight: 26, maxWidth: 365, marginBottom: 27 }}
          >
            Step away from the everyday. Discover thoughtful beauty rituals and exceptional care,
            all in one beautiful place.
          </Txt>
          <Txt size={13} color={c.warning} style={{ marginTop: 12 }}>
            Choose your service. Find your time. You’re all set.
          </Txt>
          <View style={[shared.row, { gap: 8, marginTop: 24 }]}>
            <Icon name="ShieldCheck" size={15} color={c.warning} />
            <Txt size={11} color={c.mutedForeground}>
              Personalised care. Private by design.
            </Txt>
          </View>
        </View>
        <View style={{ flex: 1, minHeight: desktop ? 450 : 320 }}>
          <Photo name="hero" style={{ height: "100%", minHeight: desktop ? 450 : 320 }} />
          <View
            style={{
              position: "absolute",
              right: 21,
              bottom: 21,
              backgroundColor: c.card,
              borderRadius: 12,
              paddingHorizontal: 18,
              paddingVertical: 13,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: c.secondary,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="Flower2" size={20} color={c.secondaryForeground} />
            </View>
            <View>
              <Txt size={12} bold>
                Your sanctuary awaits
              </Txt>
              <Txt size={10} color={c.mutedForeground}>
                Lady J Salon & Day Spa
              </Txt>
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderColor: c.border,
          marginBottom: 36,
          gap: 10,
        }}
      >
        {[
          { icon: "Heart" as const, text: "Care that’s personal" },
          { icon: "Sparkles" as const, text: "Expert beauty rituals" },
          { icon: "Leaf" as const, text: "A space to unwind" },
        ].map((v) => (
          <View
            key={v.text}
            style={{
              flexDirection: desktop ? "row" : "column",
              gap: 9,
              alignItems: "center",
              flex: 1,
            }}
          >
            <Icon name={v.icon} size={17} color={c.warning} />
            <Txt size={desktop ? 12 : 10} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {v.text}
            </Txt>
          </View>
        ))}
      </View>
      {!!specials.length && (
        <View style={{ gap: 20, marginBottom: 36 }}>
          <Heading sub="Thoughtfully paired services, one combined price.">
            Specials, just for you
          </Heading>
          {specials.map((v) => (
            <Card key={v.id} style={{ gap: 16 }}>
              <CatalogGallery photos={v.photos} cover={v.image} height={240} />
              <Txt serif size={28}>
                {v.name}
              </Txt>
              <Txt color={c.mutedForeground}>{v.description}</Txt>
              <Txt>
                {formatDuration(v.duration)} ·{" "}
                {s.session ? money(v.price) : "Free account to view price"}
              </Txt>
              <Action
                label="Book this special"
                onPress={() => {
                  s.setSelected([v.id]);
                  go("booking");
                }}
              />
            </Card>
          ))}
        </View>
      )}
      <View style={shared.section}>
        <Heading
          sub="Considered treatments. Beautiful results."
          action={<LinkText onPress={() => go("services")}>Explore all services ↗</LinkText>}
        >
          A little care, just for you
        </Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
          {featured.map(
            (v) =>
              v && (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    s.setSelected([v.id]);
                    go("booking");
                  }}
                  style={({ pressed }) => ({
                    width: desktop ? "23.8%" : "47%",
                    flexGrow: 1,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 13 }}>
                    <Photo name={v.image} style={{ height: desktop ? 186 : 150 }} />
                    <View style={{ position: "absolute", left: 12, top: 12 }}>
                      <Tag>{v.category}</Tag>
                    </View>
                  </View>
                  <Txt size={15} bold>
                    {v.name}
                  </Txt>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Txt size={12} color={c.mutedForeground}>
                      {formatDuration(v.duration)}
                    </Txt>
                    <Txt size={13} color={c.secondaryForeground}>
                      {s.session ? money(v.price) : "View service"} <Txt size={12}>↗</Txt>
                    </Txt>
                  </View>
                </Pressable>
              ),
          )}
        </View>
        <Txt size={10} color={c.mutedForeground} style={{ marginTop: 12 }}>
          Demonstration services · Sample prices in TTD · Sign in to see pricing
        </Txt>
      </View>
      <View style={{ flexDirection: desktop ? "row" : "column", gap: 22, marginBottom: 42 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: c.muted,
            borderRadius: 18,
            overflow: "hidden",
            flexDirection: "row",
            minHeight: 255,
          }}
        >
          <View style={{ flex: 1.2, padding: 27, justifyContent: "center" }}>
            <Tag gold>Lady J Academy</Tag>
            <Txt serif size={27} style={{ lineHeight: 32, marginTop: 15, marginBottom: 9 }}>
              {salonIdentity.academyName}
            </Txt>
            <Txt size={12} color={c.mutedForeground} style={{ lineHeight: 20 }}>
              Professional beauty workshops.{`\n`}Learn with confidence.
            </Txt>
            <LinkText onPress={() => go("workshops")}>Discover workshops ↗</LinkText>
          </View>
          <Photo
            name="workshop"
            style={{ flex: 1, width: undefined, height: "100%", minHeight: 255 }}
          />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: c.secondary,
            borderRadius: 18,
            overflow: "hidden",
            flexDirection: "row",
            minHeight: 255,
          }}
        >
          <View style={{ flex: 1.2, padding: 27, justifyContent: "center" }}>
            <Tag>Curated for your ritual</Tag>
            <Txt serif size={29} style={{ lineHeight: 36, marginTop: 15, marginBottom: 9 }}>
              Bring the{`\n`}feeling home.
            </Txt>
            <Txt size={12} color={c.mutedForeground} style={{ lineHeight: 20 }}>
              Thoughtful essentials for your{`\n`}everyday moments of care.
            </Txt>
            <LinkText onPress={() => go("boutique")}>Shop the boutique ↗</LinkText>
          </View>
          <Photo name="oil" style={{ flex: 1, width: undefined, height: "100%", minHeight: 255 }} />
        </View>
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 16,
          padding: desktop ? 30 : 23,
          flexDirection: desktop ? "row" : "column",
          justifyContent: "space-between",
          alignItems: desktop ? "center" : "flex-start",
          gap: 20,
          marginBottom: 12,
        }}
      >
        <View>
          <Txt serif size={28}>
            A beautiful experience starts here.
          </Txt>
          <Txt size={13} color={c.mutedForeground} style={{ marginTop: 7 }}>
            Choose your ritual. Make time for yourself. We’ll take care of the rest.
          </Txt>
        </View>
      </View>
    </Shell>
  );
}
