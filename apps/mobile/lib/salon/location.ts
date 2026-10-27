import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
const embedKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
export const mapEmbedUrl = embedKey
  ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(embedKey)}&q=${encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address)}`
  : "https://www.google.com/maps?q=" +
    encodeURIComponent(GOOGLE_BUSINESS.address) +
    "&output=embed";
// Google Maps supplies the user's origin and resolves the full verified plaza address.
export const salonDirectionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address) +
  "&dir_action=navigate";
