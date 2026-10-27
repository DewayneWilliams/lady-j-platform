import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { Action, Txt, useColors } from "./ui";

const GOOGLE_MAP_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3920.2974663583414!2d-61.54670701856093!3d10.71152386218788!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8c3609d467c89493%3A0xd872b112ed33a453!2sLady%20J%20Salon%20%26%20Day%20Spa!5e0!3m2!1sen!2sus!4v1793116749055!5m2!1sen!2sus";

export default function SalonMap() {
  const c = useColors();
  const [failed, setFailed] = useState(false);

  const openGoogleMaps = () => {
    Linking.openURL(GOOGLE_BUSINESS.profileUrl).catch(
      () => {}
    );
  };

  if (failed) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 14,
          backgroundColor: c.muted,
        }}
      >
        <Txt
          color={c.mutedForeground}
          style={{ textAlign: "center" }}
        >
          The map is temporarily unavailable.
          Open Lady J Salon & Day Spa in Google Maps.
        </Txt>

        <Action
          label="Open Google Maps"
          secondary
          onPress={openGoogleMaps}
        />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: GOOGLE_MAP_URL }}
      originWhitelist={["https://*"]}
      style={{
        flex: 1,
        width: "100%",
        backgroundColor: c.muted,
      }}
      startInLoadingState={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      mixedContentMode="never"
      scrollEnabled={false}
      nestedScrollEnabled={true}
      bounces={false}
      scalesPageToFit={true}
      allowsInlineMediaPlayback={true}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo={false}
      renderLoading={() => (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.muted,
          }}
        >
          <ActivityIndicator
            size="large"
            color={c.brandAccent}
          />
        </View>
      )}
      onError={() => setFailed(true)}
      onHttpError={(event) => {
        if (event.nativeEvent.statusCode >= 400) {
          setFailed(true);
        }
      }}
      onRenderProcessGone={() => setFailed(true)}
    />
  );
}