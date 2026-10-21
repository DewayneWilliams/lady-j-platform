import React from "react";
import { View } from "react-native";
import SalonMap from "./SalonMap";
import { Heading, Txt, useColors } from "./ui";

export default function SalonLocation() {
  const c = useColors();
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
        style={{ height: 360, width: "100%", overflow: "hidden", backgroundColor: c.muted }}
      >
        <SalonMap />
      </View>
    </View>
  );
}
