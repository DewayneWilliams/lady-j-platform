import type { ImageSourcePropType } from "react-native";
import { supabase } from "./client";
export function catalogPhotoSource(name: string): ImageSourcePropType {
  if (name.startsWith("catalog:")) {
    const uri = supabase?.storage.from("lj-catalog-media").getPublicUrl(name.slice(8))
      .data.publicUrl;
    return uri ? { uri } : photos.salon;
  }
  return name.startsWith("https://") || name.startsWith("data:image/") || name.startsWith("blob:")
    ? { uri: name }
    : photos[name] || photos.salon;
}
export const photos: Record<string, ImageSourcePropType> = {
  hero: require("@/assets/salon/hero.jpg"),
  hair: require("@/assets/salon/hair.jpg"),
  facial: require("@/assets/salon/facial.jpg"),
  nails: require("@/assets/salon/nails.jpg"),
  lashes: require("@/assets/salon/lashes.jpg"),
  massage: require("@/assets/salon/massage.jpg"),
  makeup: require("@/assets/salon/makeup.jpg"),
  workshop: require("@/assets/salon/workshop.jpg"),
  oil: require("@/assets/salon/oil.jpg"),
  roller: require("@/assets/salon/roller.jpg"),
  body: require("@/assets/salon/body.jpg"),
  gift: require("@/assets/salon/gift.jpg"),
  salon: require("@/assets/salon/salon.jpg"),
  contactReception: require("@/assets/salon/contact-reception.jpg"),
};
