import React from "react";
import { Linking, useWindowDimensions, View } from "react-native";
import { salonDirectionsUrl } from "@/lib/salon/location";
import SalonMap from "./SalonMap";
import { Action, Heading, Txt, useColors } from "./ui";

export default function SalonLocation() {
  const c = useColors();
  const { width } = useWindowDimensions();
  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      <Heading compact singleLine>
        Find Lady J Salon & Day Spa
      </Heading>
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
          West Hills, Morne Coco Road, Petit Valley
        </Txt>
      </View>
      <View
        accessibilityLabel="Google Map showing Lady J Salon & Day Spa"
        style={{
          height: width < 480 ? 350 : 420,
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
        label="Get Driving Directions"
        icon="MapPinned"
        onPress={() => void Linking.openURL(salonDirectionsUrl)}
        style={{ alignSelf: "stretch" }}
      />
    </View>
  );
}
