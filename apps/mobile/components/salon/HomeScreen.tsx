import SalonLocation from "./SalonLocation";
import { formatDuration } from "@/lib/salon/duration";
import React, { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { money } from "@/lib/salon/types";
import CatalogGallery from "./CatalogGallery";
import Shell, { useNav } from "./Shell";
import { Txt, Action, Heading, Photo, Card, useColors } from "./ui";
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
    <Shell wide footer>
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
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderColor: c.border,
          marginBottom: 0,
          gap: 10,
          height: 54,
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
          <Txt
            color={c.mutedForeground}
            style={{
              lineHeight: 26,
              flexDirection: "row",
              fontSize: 16,
            }}
          >
            {
              "You work hard, give your best to others, and deserve to feel just as good as you make everyone else feel. But finding time for yourself—and someone you can truly trust with your care—isn't always easy. At LADY J SALON & DAY SPA, we take the time to listen, understand your needs, and provide personalized beauty, grooming, and wellness services designed around you. Whether you're preparing for a special occasion or simply making yourself a priority, we're here to make every visit comfortable, relaxing, and rewarding. Because you deserve more than great results. \n\nYou deserve to leave feeling confident, refreshed, and ready to take on the world!"
            }
          </Txt>
        </View>
      </View>
      <SalonLocation />
    </Shell>
  );
}
