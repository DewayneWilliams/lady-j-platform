import React from "react";
import { Linking, useWindowDimensions, View } from "react-native";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import SalonMap from "./SalonMap";
import { Action, Heading, Txt, useColors } from "./ui";

export default function SalonLocation() {
  const c = useColors();
  const { width } = useWindowDimensions();
  return (
    <View style={{ marginTop: 34, gap: 14 }}>
      <Heading>Find Lady J Salon & Day Spa</Heading>
      <View accessibilityLabel="Lady J Salon & Day Spa address" style={{ alignItems: "center" }}>
        <Txt bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          On My Way Plaza
        </Txt>
        <Txt
          color={c.mutedForeground}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          Petit Valley, Trinidad and Tobago
        </Txt>
      </View>
      <View
        accessibilityLabel="Google Map showing Lady J Salon & Day Spa"
        style={{
          height: width < 480 ? 300 : 360,
          width: "100%",
          overflow: "hidden",
          backgroundColor: c.muted,
          borderWidth: 1,
          borderColor: c.goldBorder,
          borderRadius: 16,
        }}
      >
        <SalonMap />
      </View>
      <Action
        label="Open in Google Maps"
        secondary
        icon="MapPinned"
        onPress={() => void Linking.openURL(GOOGLE_BUSINESS.profileUrl)}
        style={{ alignSelf: "center" }}
      />
    </View>
  );
}
