import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { db, check } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import Icon from "@/lib/icons/LucideIcon";
import { Photo, ButtonLabel, ErrorBox, useColors } from "../ui";
import { OwnerText, OwnerButton } from "./OwnerUI";

export default function CatalogPhotoEditor({
  value,
  onChange,
  demo,
  disabled = false,
  onBusyChange,
}: {
  value: string[];
  onChange: (photos: string[]) => void;
  demo: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const s = useSalon();
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose() {
    if (busy || disabled) return;
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        selectionLimit: 10 - value.length,
        base64: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      if (result.assets.length + value.length > 10)
        throw new Error("Choose up to 10 photos in total.");
      setBusy(true);
      const added: string[] = [];
      for (const asset of result.assets) {
        const normalized = await manipulateAsync(asset.uri, [], {
          compress: 0.84,
          format: SaveFormat.JPEG,
          base64: true,
        });
        if (!normalized.base64)
          throw new Error("This photo could not be read. Please choose it again.");
        const bytes = Uint8Array.from(atob(normalized.base64), (char) => char.charCodeAt(0)).buffer;
        const mime = "image/jpeg";
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw new Error("Each photo must be smaller than 5 MB.");
        if (demo) {
          added.push("data:" + mime + ";base64," + normalized.base64);
        } else {
          if (!s.session) throw new Error("Please sign in as the owner.");
          const extension = "jpg";
          const path =
            s.session.user.id +
            "/" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2) +
            "." +
            extension;
          check(
            await db()
              .storage.from("lj-catalog-media")
              .upload(path, bytes, { contentType: mime, upsert: false }),
          );
          added.push("catalog:" + path);
        }
      }
      onChange([...value, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload these photos.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <View style={{ gap: 14, marginBottom: 20 }}>
      <OwnerText bold>Photos</OwnerText>
      <OwnerText muted>
        One photo or a gallery of up to 10. The first is the cover. Catalog photos are public.
      </OwnerText>
      {!!error && <ErrorBox message={error} />}
      {value.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {value.map((uri, index) => (
            <View key={uri + index} style={{ width: 124, gap: 6 }}>
              <Photo name={uri} style={{ height: 112, borderRadius: 12 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Remove photo " + (index + 1)}
                disabled={busy || disabled}
                onPress={() => onChange(value.filter((_, i) => i !== index))}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 10,
                  paddingVertical: 12,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="X" size={18} color={c.brandAccent} />
                <ButtonLabel>Remove</ButtonLabel>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <OwnerButton
        label={busy ? "Uploading" : value.length ? "Add more photos" : "Upload photos"}
        icon="ImagePlus"
        secondary
        disabled={busy || disabled || value.length >= 10}
        onPress={() => void choose()}
      />
    </View>
  );
}
