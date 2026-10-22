import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import {
  loadGoogleReviews,
  unavailableReviews,
  type GoogleReview,
  type GoogleReviewsResult,
} from "@/lib/salon/googleReviews";
import { displayDate } from "@/lib/salon/dates";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { Action, Card, Heading, Txt, useColors } from "./ui";

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
  const move = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(data.reviews.length - perPage, index + direction));
    setIndex(next);
    list.current?.scrollToOffset({ offset: next * step, animated: true });
  };
  return (
    <View
      testID="google-business-reviews"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={{ marginTop: 38, gap: 16 }}
    >
      <Heading sub="Live rating and reviews supplied by Google.">Client reviews</Heading>
      {loading ? (
        <View style={{ minHeight: 130, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator accessibilityLabel="Loading Google reviews" color={c.brandAccent} />
        </View>
      ) : data.status !== "ready" || data.rating == null || data.userRatingCount == null ? (
        <Card style={{ alignItems: "center", gap: 12 }}>
          <Icon name="MapPinned" size={28} color={c.brandAccent} />
          <Txt bold style={{ textAlign: "center" }}>
            Google rating is temporarily unavailable
          </Txt>
          <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
            No rating is shown unless it comes directly from the authorized Google Places service.
          </Txt>
          <Action
            label="Open Google Business Profile"
            secondary
            onPress={() => open(data.googleMapsUri || GOOGLE_BUSINESS.profileUrl)}
          />
        </Card>
      ) : (
        <>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${data.rating.toFixed(1)} out of 5 from ${data.userRatingCount} Google reviews`}
            onPress={() => open(data.googleMapsUri)}
            style={{ alignSelf: "center", alignItems: "center", gap: 4, padding: 8 }}
          >
            <Txt serif size={36}>
              {data.rating.toFixed(1)}
            </Txt>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: 5 }, (_, star) => (
                <Icon
                  key={star}
                  name="Star"
                  size={20}
                  color={star < Math.round(data.rating!) ? c.brandAccent : c.mutedForeground}
                />
              ))}
            </View>
            <Txt size={14} color={c.mutedForeground}>
              {data.userRatingCount.toLocaleString()} Google reviews
            </Txt>
          </Pressable>
          {!!data.reviews.length && (
            <>
              <FlatList
                ref={list}
                horizontal
                data={data.reviews}
                keyExtractor={(review) => review.id || `${review.author}-${review.date}`}
                showsHorizontalScrollIndicator={false}
                snapToInterval={step}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 16 }}
                onMomentumScrollEnd={(event) =>
                  setIndex(Math.round(event.nativeEvent.contentOffset.x / step))
                }
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Google review by ${item.author}`}
                    onPress={() => open(item.url)}
                    style={{ width: cardWidth }}
                  >
                    <Card style={{ height: "100%", gap: 9 }}>
                      <Txt bold>{item.author}</Txt>
                      <Txt size={13} color={c.mutedForeground}>
                        {item.rating.toFixed(1)} / 5 · {displayDate(item.date)}
                      </Txt>
                      {!!item.text && <Txt>{item.text}</Txt>}
                    </Card>
                  </Pressable>
                )}
              />
              {data.reviews.length > perPage && (
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
                  <Action
                    label="Previous reviews"
                    secondary
                    disabled={index === 0}
                    onPress={() => move(-1)}
                  />
                  <Action
                    label="Next reviews"
                    secondary
                    disabled={index >= data.reviews.length - perPage}
                    onPress={() => move(1)}
                  />
                </View>
              )}
            </>
          )}
        </>
      )}
      {!!notice && (
        <Txt accessibilityRole="alert" color={c.destructive}>
          {notice}
        </Txt>
      )}
    </View>
  );
}
