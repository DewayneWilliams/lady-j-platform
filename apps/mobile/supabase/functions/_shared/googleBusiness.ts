// Public business identity confirmed against both Google links supplied by the salon.
// Keep credentials in Supabase Secrets; this module is also bundled in the app.
export const GOOGLE_BUSINESS = {
  name: "Lady J Salon & Day Spa",
  address: "On My Way Plaza, Petit Valley, Trinidad and Tobago",
  placeId: "ChIJk5TIZ9QJNowRU6Qz7RKxctg",
  profileUrl:
    "https://www.google.com/maps/search/?api=1&query=Lady%20J%20Salon%20%26%20Day%20Spa&query_place_id=ChIJk5TIZ9QJNowRU6Qz7RKxctg",
  reviewUrl: "https://g.page/r/CVOkM-0SsXLYEBM/review",
} as const;
