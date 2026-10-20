import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
// The verified Place ID fixes the destination; Google Maps supplies the user's origin.
export const salonDirectionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address) +
  "&destination_place_id=" +
  encodeURIComponent(GOOGLE_BUSINESS.placeId) +
  "&dir_action=navigate";
