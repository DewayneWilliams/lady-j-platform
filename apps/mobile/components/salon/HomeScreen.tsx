import { useFonts, PlayfairDisplay_700Bold } from "@expo-google-fonts/dev";
import SalonLocation from "./SalonLocation";
import { formatDuration } from "@/lib/salon/duration";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
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
  const careHeadlineSize = Math.min(32, Math.max(16, (Math.min(width - 32, 760) || 288) / 18));
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

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold
  });

  if (!fontsLoaded) {
    return null;
  }

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
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: c.border,
          marginBottom: 0,
          gap: 4,
          minHeight: 72,
          paddingTop: 4,
          paddingBottom: 4
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
              gap: desktop ? 9 : 5,
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              paddingHorizontal: 2,
            }}
          >
            <Icon name={v.icon} size={17} color={c.warning} />
            <Txt
              size={desktop ? 12 : 10}
              color={c.foreground}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={{ textAlign: "center", width: "100%", lineHeight: desktop ? 18 : 15 }}
            >
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
                  go("booking", { id: v.id });
                }}
              />
            </Card>
          ))}
        </View>
      )}
      <View style={{ gap: 28, marginBottom: 24 }}>
        <View
          style={{
            gap: 14,
            maxWidth: 760,
            width: "100%",
            alignSelf: "center",
            alignItems: "center",
            paddingTop: 6,
            justifyContent: "center",
          }}
        >
          <Txt
            bold
            size={careHeadlineSize}
            style={{
              lineHeight: careHeadlineSize * 1.2,
              textAlign: "center",
              alignItems: "center",
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 20,
              paddingTop: 4,
              paddingBottom: 4
            }}
          >
            Look Your Best. Feel Your Best!
          </Txt>
          <Txt
            color={c.mutedForeground}
            style={{
              lineHeight: 26,
              flexDirection: "column",
              fontSize: 16,
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              paddingBottom: 4,
              paddingTop: 4
            }}
          >
            {"You work hard, give your best to others, and deserve to feel just as good as you make everyone else feel. But finding time for yourself—and someone you can truly trust with your care—isn't always easy. At LADY J SALON & DAY SPA, we take the time to listen, understand your needs, and provide personalized beauty, grooming, and wellness services designed around you. Whether you're preparing for a special occasion or simply making yourself a priority, we're here to make every visit comfortable, relaxing, and rewarding. Because you deserve more than great results. You deserve to leave feeling confident, refreshed, and ready to take on the world!"}
          </Txt>
          <Pressable
            testID="home-consultation-cta"
            collapsable={false}
                        accessibilityRole="button"
            accessibilityLabel="Request Your Free Consultation, 15 Minutes, Complimentary"
            accessibilityHint="Opens the complete free consultation request"
            onPress={() => go("consultation")}
            style={{
              width: "100%",
              maxWidth: 560,
              minWidth: 0,
              minHeight: 72,
              alignSelf: "center",
              borderRadius: 16,
              backgroundColor: c.consultationFill,
              position: "relative",
              zIndex: 2,
              overflow: "visible",
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: 1,
              ...(Platform.OS === "web"
                ? ({ boxShadow: "0 5px 10px rgba(29, 78, 216, 0.18)" } as object)
                : {
                    shadowColor: c.consultationFill,
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 6,
                  }),
            }}
          >
            <Txt
              bold
              size={18}
              color={c.consultationForeground}
              minimumFontScale={1}
              style={{
                width: "100%",
                textAlign: "center",
                lineHeight: 24,
                opacity: 1,
                fontSize: 24
              }}
            >
              Request Your Free Consultation
            </Txt>
            <Txt
              size={14}
              color={c.consultationForeground}
                style={{
                  textAlign: "center",
                  marginTop: 3,
                  lineHeight: 20,
                  opacity: 1,
                  fontSize: 18
                }}
            >
              15 Minutes • Complimentary
            </Txt>
          </Pressable>
        </View>
      </View>
      <SalonLocation />
    </Shell>
  );
}
