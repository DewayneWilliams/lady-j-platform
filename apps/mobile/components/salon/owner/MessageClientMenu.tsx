import React, { useState } from "react";
import { View, Modal, Pressable, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { whatsappContactUrl, internationalNumber } from "@/lib/salon/whatsapp";
import { Txt, ButtonLabel, ErrorBox, useColors } from "../ui";
type Channel = "WhatsApp Text" | "WhatsApp Call" | "Mobile Text" | "Mobile Call";
export default function MessageClientMenu({
  name,
  whatsapp,
  phone,
  demo = false,
  message = "",
  onClose,
}: {
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
  demo?: boolean;
  message?: string;
  onClose: () => void;
}) {
  const c = useColors();
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionHeight, setActionHeight] = useState(90);
  const wa = internationalNumber(whatsapp) || internationalNumber(phone);
  const mobile = internationalNumber(phone) || internationalNumber(whatsapp);
  const phoneDevice =
    Platform.OS !== "web" ||
    (typeof globalThis.navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(globalThis.navigator.userAgent));
  async function open(channel: Channel) {
    if (busy) return;
    setError("");
    setHint("");
    if (demo) {
      setHint("Sample contact. Communication is available for saved live clients.");
      return;
    }
    const number = channel.startsWith("WhatsApp") ? wa : mobile;
    if (!number) {
      setError("No valid number is saved. Edit the client and include the country code.");
      return;
    }
    const uri =
      channel === "Mobile Call"
        ? "tel:+" + number
        : channel === "Mobile Text"
          ? "sms:+" + number
          : whatsappContactUrl(number, channel === "WhatsApp Text" ? message : "");
    if (!uri) return;
    if (channel.startsWith("Mobile") && !phoneDevice) {
      setError("Open this menu on your phone to send a mobile text or make a mobile call.");
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS !== "web" && !(await Linking.canOpenURL(uri)))
        throw new Error("No compatible app is available on this device.");
      await Linking.openURL(uri);
      if (channel === "WhatsApp Call")
        setHint("In WhatsApp, tap the phone icon at the top of this chat to start the call.");
    } catch {
      setError(
        "This device could not open the selected app. Check that it is installed and that the saved number includes its country code.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,.45)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <SafeAreaView
          edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
          style={{
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
            backgroundColor: c.card,
            borderRadius: 24,
            padding: 18,
            gap: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 44 }} />
            <View style={{ flex: 1 }}>
              <Txt size={26} bold style={{ textAlign: "center" }}>
                Message Client
              </Txt>
              <Txt size={16} color={c.mutedForeground} style={{ textAlign: "center" }}>
                {name}
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close contact actions"
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <Icon name="X" size={24} color={c.foreground} />
            </Pressable>
          </View>
          {(
            [
              ["WhatsApp Text", "WhatsApp Call"],
              ["Mobile Text", "Mobile Call"],
            ] as Channel[][]
          ).map((row, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "stretch", gap: 10 }}>
              {row.map((channel) => {
                const missing = channel.startsWith("WhatsApp") ? !wa : !mobile;
                const disabled = busy || missing || (channel.startsWith("Mobile") && !phoneDevice);
                return (
                  <Pressable
                    key={channel}
                    accessibilityRole="button"
                    accessibilityLabel={channel}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onLayout={(event) =>
                      setActionHeight((height) => Math.max(height, event.nativeEvent.layout.height))
                    }
                    onPress={() => void open(channel)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: actionHeight,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: disabled ? c.muted : c.brandAccentSurface,
                      paddingHorizontal: 8,
                      paddingVertical: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <Icon
                      name={channel.endsWith("Call") ? "Phone" : "MessageCircle"}
                      size={23}
                      color={disabled ? c.mutedForeground : c.brandAccent}
                    />
                    <ButtonLabel
                      size={16}
                      color={disabled ? c.mutedForeground : c.foreground}
                      style={{ textAlign: "center" }}
                    >
                      {channel}
                    </ButtonLabel>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {(!wa || !mobile) && (
            <Txt size={14} color={c.mutedForeground}>
              Save a valid WhatsApp or mobile number, including the country code, to enable these
              actions.
            </Txt>
          )}
          {!phoneDevice && (
            <Txt size={14} color={c.mutedForeground}>
              Mobile texts and calls are available on phones.
            </Txt>
          )}
          <Txt size={14} color={c.mutedForeground}>
            WhatsApp calls open the chat. Tap Call in WhatsApp to begin.
          </Txt>
          {!!hint && (
            <View accessibilityLiveRegion="polite">
              <Txt>{hint}</Txt>
            </View>
          )}
          {!!error && <ErrorBox message={error} />}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
