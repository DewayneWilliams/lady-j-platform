import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
export const mapEmbedUrl =
  "https://www.google.com/maps?q=" + encodeURIComponent(GOOGLE_BUSINESS.address) + "&output=embed";
// Google Maps supplies the user's origin and resolves the full verified plaza address.
export const salonDirectionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address) +
  "&dir_action=navigate";
