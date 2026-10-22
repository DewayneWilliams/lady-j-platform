import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { db, check } from "./client";
export type GoogleReview = {
  id: string;
  author: string;
  authorUrl: string | null;
  photoUrl: string | null;
  rating: number;
  date: string;
  text: string;
  url: string;
  reportUrl: string | null;
};
export type GoogleReviewsResult = {
  status: "ready" | "unavailable";
  rating: number | null;
  userRatingCount: number | null;
  address?: string;
  location?: { latitude: number; longitude: number } | null;
  reviews: GoogleReview[];
  googleMapsUri: string | null;
  attributions?: { provider?: string; providerUri?: string }[];
};
export const unavailableReviews: GoogleReviewsResult = {
  status: "unavailable",
  rating: null,
  userRatingCount: null,
  reviews: [],
  googleMapsUri: GOOGLE_BUSINESS.profileUrl,
};
export async function loadGoogleReviews(): Promise<GoogleReviewsResult> {
  const result = check(await db().functions.invoke("lj-google-reviews"));
  if (!result || !Array.isArray(result.reviews)) return unavailableReviews;
  return { ...result, googleMapsUri: result.googleMapsUri || GOOGLE_BUSINESS.profileUrl };
}
