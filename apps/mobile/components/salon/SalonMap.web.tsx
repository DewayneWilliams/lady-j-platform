import React, { useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { mapEmbedUrl } from "@/lib/salon/location";
import { Action, Txt, useColors } from "./ui";

export default function SalonMap() {
  const c = useColors();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}
      >
        <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
          Google Maps could not be embedded here. Open the verified Lady J location in Google Maps.
        </Txt>
        <Action
          label="Open in Google Maps"
          secondary
          onPress={() => void Linking.openURL(GOOGLE_BUSINESS.profileUrl)}
        />
      </View>
    );

  // createElement keeps Draftbit's JSX source marker from being forwarded to the DOM iframe.
  return (
    <View style={{ flex: 1, position: "relative" }}>
      {!loaded && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={c.brandAccent} />
        </View>
      )}
      {React.createElement("iframe", {
        title: "Lady J Salon & Day Spa on Google Maps",
        src: mapEmbedUrl,
        width: "100%",
        height: "100%",
        loading: "lazy",
        allowFullScreen: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        onLoad: () => setLoaded(true),
        onError: () => setFailed(true),
        style: { width: "100%", height: "100%", border: 0, display: "block" },
      })}
    </View>
  );
}
