import React, { useState } from "react";
import { View, Pressable, Linking } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { GOOGLE_BUSINESS } from "@/supabase/functions/_shared/googleBusiness";
import { salonDirectionsUrl } from "@/lib/salon/location";
import { Card, Txt, Action, useColors } from "./ui";

export default function SalonLocation() {
  const c = useColors();
  const [error, setError] = useState("");
  function open(url: string) {
    setError("");
    void Linking.openURL(url).catch(() =>
      setError("Google Maps could not be opened. Please try again."),
    );
  }
  return (
    <Card
      testID="salon-location"
      style={{
        marginTop: 24,
        padding: 28,
        gap: 18,
        alignItems: "center",
        borderColor: c.goldBorder,
        backgroundColor: c.goldSurface,
      }}
    >
      <Icon name="MapPin" size={28} color={c.brandAccent} />
      <Txt size={28} serif style={{ textAlign: "center" }}>
        Visit Us
      </Txt>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="View salon location on Google Maps"
        onPress={() => open(GOOGLE_BUSINESS.profileUrl)}
        style={{ minHeight: 48, justifyContent: "center", maxWidth: 680 }}
      >
        <Txt size={18} color={c.brandAccent} style={{ textAlign: "center", lineHeight: 28 }}>
          {GOOGLE_BUSINESS.address}
        </Txt>
      </Pressable>
      <View style={{ width: "100%", maxWidth: 320 }}>
        <Action label="Get Directions" onPress={() => open(salonDirectionsUrl)} />
      </View>
      {!!error && (
        <Txt accessibilityRole="alert" color={c.destructive} style={{ textAlign: "center" }}>
          {error}
        </Txt>
      )}
    </Card>
  );
}
