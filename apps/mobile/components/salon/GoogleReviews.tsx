import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Linking, useWindowDimensions } from "react-native";
import {
  loadGoogleReviews,
  unavailableReviews,
  type GoogleReview,
  type GoogleReviewsResult,
} from "@/lib/salon/googleReviews";
import { displayDate } from "@/lib/salon/dates";
import { useColors } from "./ui";
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
  return null;
}
