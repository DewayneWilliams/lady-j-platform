import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
export const mapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4662.040083112988!2d-61.5472388712439!3d10.711884884698627!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8c3609d467c89493%3A0xd872b112ed33a453!2sLady%20J%20Salon%20%26%20Day%20Spa!5e0!3m2!1sen!2sus!4v1792612937945!5m2!1sen!2sus";
// The verified Place ID fixes the destination; Google Maps supplies the user's origin.
export const salonDirectionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address) +
  "&destination_place_id=" +
  encodeURIComponent(GOOGLE_BUSINESS.placeId) +
  "&dir_action=navigate";
