import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
        if (!asset.base64 && !asset.file)
          throw new Error("This photo could not be read. Please choose it again.");
        const bytes = asset.file
          ? await asset.file.arrayBuffer()
          : Uint8Array.from(atob(asset.base64!), (char) => char.charCodeAt(0)).buffer;
        const header = new Uint8Array(bytes);
        const mime =
          header[0] === 255 && header[1] === 216
            ? "image/jpeg"
            : header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71
              ? "image/png"
              : header[0] === 82 &&
                  header[1] === 73 &&
                  header[2] === 70 &&
                  header[3] === 70 &&
                  header[8] === 87 &&
                  header[9] === 69 &&
                  header[10] === 66 &&
                  header[11] === 80
                ? "image/webp"
                : null;
        if (!mime) throw new Error("Choose JPEG, PNG or WebP images.");
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw new Error("Each photo must be smaller than 5 MB.");
        if (demo) {
          if (asset.base64) added.push("data:" + mime + ";base64," + asset.base64);
          else added.push(asset.uri);
        } else {
          if (!s.session) throw new Error("Please sign in as the owner.");
          const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
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
