import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
export const mapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2636.574519959847!2d-61.54151409341333!3d10.712783148068453!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8c3609d467c89493%3A0xd872b112ed33a453!2sLady%20J%20Salon%20%26%20Day%20Spa!5e0!3m2!1sen!2snl!4v1792523191056!5m2!1sen!2snl";
// The verified Place ID fixes the destination; Google Maps supplies the user's origin.
export const salonDirectionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(GOOGLE_BUSINESS.name + ", " + GOOGLE_BUSINESS.address) +
  "&destination_place_id=" +
  encodeURIComponent(GOOGLE_BUSINESS.placeId) +
  "&dir_action=navigate";
