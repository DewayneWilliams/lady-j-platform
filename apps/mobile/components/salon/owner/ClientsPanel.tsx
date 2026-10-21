import { useBottomNavigationSpacing } from "../BottomNavigation";
import React, { useState } from "react";
import { View, Pressable, FlatList, TextInput, Linking } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { whatsappContactUrl } from "@/lib/salon/whatsapp";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Client } from "@/lib/salon/types";
import { fonts } from "@/lib/salon/design";
import { Card, Txt, ButtonLabel, useColors, ErrorBox } from "../ui";
import { OwnerButton, OwnerEmpty, OwnerText } from "./OwnerUI";
import { ProfileAvatar } from "../ProfilePhoto";
type Profile = Record<string, unknown>;
export default function ClientsPanel({
  clients,
  profiles,
  demo,
  onAdd,
  onClient,
  onProfile,
  error,
  onRetry,
}: {
  demo: boolean;
  error?: string;
  onRetry?: () => void;
  clients: Client[];
  profiles: Profile[];
  onAdd: () => void;
  onClient: (v: Client) => void;
  onProfile: (v: Profile) => void;
}) {
  const c = useColors();
  const navigationSpacing = useBottomNavigationSpacing(true);
  const s = useSalon();
  const [query, setQuery] = useState(""),
    [mode, setMode] = useState("Client records");
  const records =
    mode === "Client records"
      ? clients.map((v) => ({
          id: v.id,
          name: v.full_name,
          detail: v.phone || v.email,
          notes: "",
          client: v,
          profile: undefined as Profile | undefined,
          photoPath: v.use_owner_photo && v.owner_photo_path ? v.owner_photo_path : v.client_photo_path,
          photoUpdatedAt: v.profile_photo_updated_at,
        }))
      : profiles.map((v) => ({
          id: String(v.id),
          name: String(v.full_name || "Profile not completed"),
          detail: String(v.phone || "Phone not supplied"),
          notes: "",
          client: undefined as Client | undefined,
          profile: v,
          photoPath: String(v.profile_photo_path || "") || null,
          photoUpdatedAt: String(v.profile_photo_updated_at || "") || null,
        }));
  const filtered = records
    .filter((v) =>
      (v.name + " " + v.detail + " " + v.notes).toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id),
    );
  return (
    <FlatList
      data={filtered}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      keyExtractor={(v) => v.id}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: Math.max(50, navigationSpacing + 20),
        maxWidth: 1200,
        width: "100%",
        alignSelf: "center",
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {!!error && <ErrorBox message={error} retry={onRetry} />}
          <View
            style={{
              width: "100%",
              alignSelf: "stretch",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 22,
            }}
          >
            <OwnerButton label="Add client" icon="UserPlus" accent onPress={onAdd} />
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 4,
              marginBottom: 18,
              padding: 5,
              borderRadius: 14,
              backgroundColor: c.muted,
            }}
          >
            {["Client records", "Registered accounts"].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === v }}
                onPress={() => setMode(v)}
                style={{
                  flex: 1,
                  minHeight: 54,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  minWidth: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor: mode === v ? c.card : "transparent",
                }}
              >
                <ButtonLabel size={20}>
                  {v === "Client records" ? "Clients" : "Accounts"}
                </ButtonLabel>
              </Pressable>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
              paddingHorizontal: 16,
              borderRadius: 12,
              marginBottom: 22,
            }}
          >
            <Icon name="Search" size={22} color={c.mutedForeground} />
            <TextInput
              accessibilityLabel="Find a client"
              placeholder="Search name or phone"
              placeholderTextColor={c.mutedForeground}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                minHeight: 58,
                fontFamily: fonts.body,
                fontSize: 20,
                color: c.foreground,
              }}
            />
          </View>
        </View>
      }
      ListFooterComponent={
        <OwnerText size={16} muted>
          WhatsApp uses saved international numbers. WhatsApp contact-list import is not connected.
        </OwnerText>
      }
      ListEmptyComponent={
        <OwnerEmpty
          title={query ? "No matching clients" : "A thoughtful relationship starts here"}
          body={
            query
              ? "Try a different name or contact detail."
              : mode === "Client records"
                ? "Add a client record or connect a registered account."
                : "Customer accounts appear here after registration."
          }
        />
      }
      renderItem={({ item }) => (
        <View>
          <Card
            style={{
              marginBottom: 14,
              padding: 18,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"View client " + item.name}
              onPress={() =>
                item.client ? onClient(item.client) : item.profile && onProfile(item.profile)
              }
              style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <ProfileAvatar
                name={item.name}
                path={item.photoPath}
                version={item.photoUpdatedAt}
                size={52}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <OwnerText size={24} bold>
                  {item.name}
                </OwnerText>
                <OwnerText muted>{item.detail || "Client details not supplied"}</OwnerText>
                {!!item.notes && (
                  <Txt size={18} color={c.mutedForeground}>
                    {item.notes}
                  </Txt>
                )}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"WhatsApp " + item.name}
              disabled={
                demo ||
                !whatsappContactUrl(
                  item.client?.whatsapp_phone ||
                    item.client?.phone ||
                    String(item.profile?.phone || ""),
                )
              }
              onPress={(event) => {
                event.stopPropagation();
                const url = whatsappContactUrl(
                  item.client?.whatsapp_phone ||
                    item.client?.phone ||
                    String(item.profile?.phone || ""),
                );
                if (url && !demo)
                  void Linking.openURL(url).catch(() => s.notify("Unable to open WhatsApp."));
              }}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="MessageCircle"
                size={24}
                color={
                  demo ||
                  !whatsappContactUrl(
                    item.client?.whatsapp_phone ||
                      item.client?.phone ||
                      String(item.profile?.phone || ""),
                  )
                    ? c.mutedForeground
                    : c.brandAccent
                }
              />
            </Pressable>
            <Icon name="ChevronRight" size={23} color={c.warning} />
          </Card>
        </View>
      )}
    />
  );
}
