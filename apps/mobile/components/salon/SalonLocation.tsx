import { PlayfairDisplay_400Regular, useFonts } from "@expo-google-fonts/dev";
import React from "react";
import { Linking, useWindowDimensions, View } from "react-native";
import { salonDirectionsUrl } from "@/lib/salon/location";
import SalonMap from "./SalonMap";
import { Action, Txt, useColors } from "./ui";

export default function SalonLocation() {
  const c = useColors();
  const { width } = useWindowDimensions();

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      <Txt
        bold
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        size={Math.min(28, Math.max(19, (width - 32) / 14.5))}
        style={{
          textAlign: "center",
          lineHeight: 34,
          fontFamily: "PlayfairDisplay_400Regular",
          fontSize: 20,
        }}
      >
        Find Lady J Salon & Day Spa
      </Txt>
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
