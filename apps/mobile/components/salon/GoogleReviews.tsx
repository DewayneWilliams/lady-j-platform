import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import Icon from "@/lib/icons/LucideIcon";
import {
  loadGoogleReviews,
  unavailableReviews,
  type GoogleReview,
  type GoogleReviewsResult,
} from "@/lib/salon/googleReviews";
import { displayDate } from "@/lib/salon/dates";
import { Txt, ButtonLabel, Card, useColors } from "./ui";
export default function GoogleReviews() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<GoogleReviewsResult>(unavailableReviews);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const list = useRef<FlatList<GoogleReview>>(null);
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Math.max(260, Math.min(width - 40, 1216)));
  const active = useRef(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadGoogleReviews();
      if (active.current) setData(result);
    } catch {
      if (active.current) setData(unavailableReviews);
    } finally {
      if (active.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
    };
  }, [load]);
  const perPage = containerWidth >= 960 ? 3 : containerWidth >= 650 ? 2 : 1;
  const cardWidth = (containerWidth - 16 * (perPage - 1)) / perPage;
  const step = cardWidth + 16;
  const open = (url: string | null) => {
    if (url)
      void Linking.openURL(url).catch(() =>
        setNotice("Google could not be opened. Please try again."),
      );
  };
  return (
    <View
      testID="google-reviews"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        gap: 20,
        paddingTop: 30,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ gap: 10, alignItems: "center" }}>
        <Txt size={32} serif style={{ textAlign: "center" }}>
          Client Experiences
        </Txt>
        <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
          Real experiences. Genuine care.
        </Txt>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          <Icon name="BadgeCheck" size={19} color={c.brandAccent} />
          <Txt size={16} bold>
            Verified Google Reviews
          </Txt>
        </View>
      </View>
      {loading ? (
        <View style={{ padding: 30, alignItems: "center", gap: 12 }}>
          <ActivityIndicator color={c.brandAccent} />
          <Txt size={15} color={c.mutedForeground}>
            Checking Google feedback
          </Txt>
        </View>
      ) : data.reviews.length ? (
        <>
          <FlatList
            ref={list}
            horizontal
            data={data.reviews}
            keyExtractor={(r) => r.id}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={step}
            snapToAlignment="start"
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            renderItem={({ item: r }) => (
              <Card style={{ width: cardWidth, gap: 16, padding: 22 }}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={"View " + r.author + " on Google"}
                  onPress={() => open(r.authorUrl || r.url)}
                  style={{ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 48 }}
                >
                  {r.photoUrl ? (
                    <Image
                      source={{ uri: r.photoUrl }}
                      cachePolicy="none"
                      style={{ width: 42, height: 42, borderRadius: 21 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: c.muted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="UserRound" size={22} color={c.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Txt bold>{r.author}</Txt>
                    <Txt size={13} color={c.mutedForeground}>
                      {displayDate(r.date)}
                    </Txt>
                  </View>
                </Pressable>
                <View
                  accessibilityLabel={r.rating + " out of 5 stars"}
                  style={{ flexDirection: "row", gap: 4 }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon
                      key={n}
                      name="Star"
                      size={18}
                      color={n <= r.rating ? c.warning : c.mutedForeground}
                      fill={n <= r.rating ? c.warning : "none"}
                    />
                  ))}
                </View>
                {!!r.text && <Txt style={{ lineHeight: 26 }}>{r.text}</Txt>}
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="View this review on Google"
                  onPress={() => open(r.url)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Txt size={14} color={c.brandAccent}>
                    Read on Google
                  </Txt>
                </Pressable>
                {!!r.reportUrl && (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => open(r.reportUrl)}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Txt size={13} color={c.mutedForeground}>
                      Report Review
                    </Txt>
                  </Pressable>
                )}
              </Card>
            )}
          />
          {data.reviews.length > perPage && (
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {[-1, 1].map((direction) => (
                <Pressable
                  key={direction}
                  accessibilityRole="button"
                  accessibilityLabel={direction < 0 ? "Previous reviews" : "Next reviews"}
                  disabled={direction < 0 ? index === 0 : index >= data.reviews.length - perPage}
                  onPress={() => {
                    const next = Math.max(
                      0,
                      Math.min(data.reviews.length - perPage, index + direction),
                    );
                    setIndex(next);
                    list.current?.scrollToOffset({ offset: next * step, animated: true });
                  }}
                  style={{ padding: 12, borderRadius: 99, borderWidth: 1, borderColor: c.border }}
                >
                  <Icon
                    name={direction < 0 ? "ChevronLeft" : "ChevronRight"}
                    size={20}
                    color={c.foreground}
                  />
                </Pressable>
              ))}
            </View>
          )}
          <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
            A selection of reviews from Google Maps.
          </Txt>
          <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
            Google Maps
          </Txt>
          {data.attributions?.map((a, i) => (
            <Pressable key={i} accessibilityRole="link" onPress={() => open(a.providerUri || null)}>
              <Txt size={13} style={{ textAlign: "center" }}>
                {a.provider}
              </Txt>
            </Pressable>
          ))}
        </>
      ) : (
        <Card style={{ padding: 30, gap: 14, alignItems: "center", backgroundColor: c.card }}>
          <Icon name="MessageSquareHeart" size={30} color={c.brandAccent} />
          <Txt size={22} bold style={{ textAlign: "center" }}>
            Your Experience Matters
          </Txt>
          <Txt color={c.mutedForeground} style={{ textAlign: "center", maxWidth: 500 }}>
            Google reviews are not available here right now. Only authentic feedback from our Google
            Business Profile will appear.
          </Txt>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={{ minHeight: 44, padding: 10 }}
          >
            <Txt size={15} color={c.brandAccent}>
              Check Again
            </Txt>
          </Pressable>
        </Card>
      )}
      <View style={{ alignItems: "center", gap: 10 }}>
        <Pressable
          accessibilityRole="link"
          accessibilityState={{ disabled: !data.googleMapsUri }}
          disabled={!data.googleMapsUri}
          onPress={() => open(data.googleMapsUri)}
          style={{
            minHeight: 52,
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: c.goldBorder,
            backgroundColor: c.goldSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ButtonLabel
            size={16}
            color={data.googleMapsUri ? c.foreground : c.mutedForeground}
            style={{ textAlign: "center" }}
          >
            View verified feedback on Google
          </ButtonLabel>
        </Pressable>
        {!data.googleMapsUri && (
          <Txt size={13} color={c.mutedForeground}>
            The salon’s Google profile link is being connected.
          </Txt>
        )}
        {!!notice && <Txt size={14}>{notice}</Txt>}
      </View>
    </View>
  );
}
