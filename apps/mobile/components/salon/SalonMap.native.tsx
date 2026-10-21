import React, { useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { WebView } from "react-native-webview";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { mapEmbedUrl } from "@/lib/salon/location";
import { Action, Txt, useColors } from "./ui";

export default function SalonMap() {
  const c = useColors();
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}
      >
        <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
          The map could not be loaded. Open the verified Lady J location in Google Maps.
        </Txt>
        <Action
          label="Open Google Maps"
          secondary
          onPress={() => void Linking.openURL(GOOGLE_BUSINESS.profileUrl)}
        />
      </View>
    );

  return (
    <WebView
      source={{ uri: mapEmbedUrl }}
      originWhitelist={["https://*"]}
      style={{ flex: 1, backgroundColor: c.muted }}
      startInLoadingState
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="never"
      renderLoading={() => (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.brandAccent} />
        </View>
      )}
      onError={() => setFailed(true)}
      onHttpError={(event) => {
        if (event.nativeEvent.statusCode >= 400) setFailed(true);
      }}
      onRenderProcessGone={() => setFailed(true)}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo={false}
    />
  );
}
