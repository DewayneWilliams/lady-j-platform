import React from "react";
import { Linking, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Button } from "@/components/ui/button";
import { useSalon } from "@/lib/salon/SalonProvider";
import { whatsappSupportUrl } from "@/lib/salon/whatsapp";
import { Txt, useColors } from "./ui";
/** Support is available through Contact, separate from the five navigation tabs. */
export default function SupportContact() {
  const c = useColors();
  const { settings, notify } = useSalon();
  const url = whatsappSupportUrl(settings?.whatsapp_phone);
  const openSupport = () => {
    if (!url) return;
    void Linking.openURL(url).catch(() =>
      notify("WhatsApp could not open. Please try again or use the salon contact details."),
    );
  };
  return (
    <View style={{ gap: 8 }}>
      <Button
        accessibilityLabel="WhatsApp support"
        disabled={!url}
        onPress={openSupport}
        style={{
          minHeight: 52,
          borderRadius: 11,
          paddingHorizontal: 20,
          flexDirection: "row",
          gap: 10,
          alignSelf: "flex-start",
          backgroundColor: c.tertiary,
        }}
      >
        <FontAwesome name="whatsapp" size={23} color={c.tertiaryForeground} />
        <Txt size={15} bold color={c.tertiaryForeground}>
          WhatsApp support
        </Txt>
      </Button>
      {!url && (
        <Txt size={13} color={c.mutedForeground}>
          WhatsApp support number awaiting setup.
        </Txt>
      )}
    </View>
  );
}
