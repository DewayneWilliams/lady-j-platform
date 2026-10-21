import SalonLocation from "./SalonLocation";
import GoogleReviews from "./GoogleReviews";
import { formatDuration } from "@/lib/salon/duration";
import React, { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { money } from "@/lib/salon/types";
import CatalogGallery from "./CatalogGallery";
import Shell, { useNav } from "./Shell";
import { Txt, Action, Heading, Photo, Card, useColors, shared } from "./ui";
export default function HomeScreen() {
  const c = useColors(),
    go = useNav(),
    { width } = useWindowDimensions(),
    s = useSalon();
  const desktop = width >= 850;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const next = Math.min(
      ...s.homeSpecials
        .map((offer) =>
          offer.homepage_expires_at ? Date.parse(offer.homepage_expires_at) : Infinity,
        )
        .filter((expiry) => expiry > now),
    );
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
        void s.refresh();
      },
      Math.min(next - Date.now() + 10, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [s.homeSpecials, now, s.refresh]);
  const specials = s.homeSpecials
    .filter(
      (v) =>
        v.is_special &&
        v.promote_on_home &&
        v.active &&
        (!v.homepage_expires_at || Date.parse(v.homepage_expires_at) > Date.now()),
    )
    .slice(0, 2);
  return (
    <Shell wide>
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
                A little time, fully yours
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
          { icon: "Sparkles" as const, text: "Expert beauty treatments" },
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
              <CatalogGallery photos={v.photos} cover={v.image} height={144} />
              <Txt serif size={28}>
                {v.name}
              </Txt>
              <Txt color={c.mutedForeground}>{v.description}</Txt>
              <Txt>
                {formatDuration(v.duration)} · {money(v.price)}
              </Txt>
              <Action
                label="Book this special"
                onPress={() => {
                  s.setSelected([v.id]);
                  go("booking", { id: v.id });
                }}
              />
            </Card>
          ))}
        </View>
      )}
      <View style={{ gap: 28, marginBottom: 24 }}>
        <View style={{ gap: 14, maxWidth: 760 }}>
          <Heading>A moment for you. A difference you carry.</Heading>
          <Txt color={c.mutedForeground} style={{ lineHeight: 26 }}>
            A polished finish is only part of the experience. It is the ease of being heard, the
            confidence of a clear plan, and the quiet pleasure of leaving ready for your day.
          </Txt>
          <Txt color={c.mutedForeground} style={{ lineHeight: 26 }}>
            Tell us what you love, what you would like to change, and what makes you comfortable. We
            shape the visit around your goals, your routine, and the way you want to feel.
          </Txt>
        </View>
        <View style={{ gap: 16, paddingVertical: 12, maxWidth: 760 }}>
          <Heading>Care you will be glad you made time for.</Heading>
          <Txt color={c.mutedForeground} style={{ lineHeight: 26 }}>
            The appointments you keep for yourself become part of how you show up in life. Let this
            be the beginning of feeling more at ease, more confident, and more like you, long after
            you leave the chair.
          </Txt>
          <Action
            label="BOOK YOUR APPOINTMENT"
            onPress={() =>
              go(
                s.session || s.testMode ? "booking" : "register",
                s.session || s.testMode ? {} : { next: "booking" },
              )
            }
            style={{ alignSelf: "stretch" }}
          />
          <Txt size={14} color={c.mutedForeground}>
            Start with a conversation. Leave with a plan that feels right.
          </Txt>
        </View>
      </View>
      <GoogleReviews />
      <SalonLocation />
    </Shell>
  );
}
