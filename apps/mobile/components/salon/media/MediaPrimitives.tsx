import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Icon from "@/lib/icons/LucideIcon";
import { fonts } from "@/lib/salon/design";
import { signedMedia } from "@/lib/salon/media/api";
import { Txt, useColors } from "../ui";
import { OwnerButton } from "../owner/OwnerUI";
import type { MediaItem } from "@/lib/salon/media/types";
export function usePrivateUrl(path: string | undefined, revision = 0) {
  const [uri, setUri] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUri(undefined);
    setFailed(false);
    if (!path) return;
    const refresh = async () => {
      try {
        const url = await signedMedia(path);
        if (active) {
          setUri(url);
          setFailed(false);
        }
      } catch {
        if (active) {
          setUri(undefined);
          setFailed(true);
        }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, revision]);
  return { uri, failed };
}
export function MediaThumbnail({
  item,
  style,
  revision = 0,
}: {
  item: MediaItem;
  style?: ViewStyle;
  revision?: number;
}) {
  const c = useColors();
  const { uri, failed } = usePrivateUrl(
    item.status === "ready" ? item.thumbnail_path : undefined,
    revision,
  );
  return (
    <View
      style={[
        {
          backgroundColor: c.muted,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="none"
          accessibilityLabel={item.name}
        />
      ) : item.status === "uploading" || failed ? (
        <Icon name={failed ? "LockKeyhole" : "CloudUpload"} size={28} color={c.mutedForeground} />
      ) : (
        <ActivityIndicator color={c.brandAccent} />
      )}
      {item.kind === "video" && (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            backgroundColor: c.card,
            borderRadius: 8,
            padding: 6,
            flexDirection: "row",
            gap: 4,
            alignItems: "center",
          }}
        >
          <Icon name="Play" size={14} color={c.foreground} />
          <Txt size={12}>
            {item.duration
              ? Math.floor(item.duration / 60) +
                ":" +
                String(Math.floor(item.duration % 60)).padStart(2, "0")
              : "Video"}
          </Txt>
        </View>
      )}
      {!!item.favorite && (
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: c.card,
            padding: 5,
            borderRadius: 99,
          }}
        >
          <Icon name="Heart" size={15} color={c.brandAccent} />
        </View>
      )}
    </View>
  );
}
export function MediaField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Txt size={16} bold>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          padding: 14,
          color: c.foreground,
          backgroundColor: c.background,
          fontFamily: fonts.body,
          fontSize: 18,
          minHeight: multiline ? 100 : 54,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
export function MediaSheet({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  const c = useColors();
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        <View style={{ width: "100%", maxWidth: 900, alignSelf: "center", flex: 1 }}>
          <View
            style={{
              padding: 20,
              borderBottomWidth: 1,
              borderColor: c.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Txt size={26} bold style={{ flex: 1 }}>
              {title}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={busy}
              onPress={onClose}
              style={{ padding: 12 }}
            >
              <Icon name="X" size={24} color={busy ? c.mutedForeground : c.foreground} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 50 }}
          >
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function ChoiceRow<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: value === v }}
          onPress={() => onChange(v)}
          style={{
            minHeight: 46,
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: value === v ? c.brandAccent : c.border,
            backgroundColor: value === v ? c.brandAccentSurface : c.card,
          }}
        >
          <Txt size={16} bold color={value === v ? c.brandAccent : c.foreground}>
            {v}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function ConfirmMedia({
  title,
  body,
  onCancel,
  onConfirm,
  busy,
  error,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  error?: string;
}) {
  return (
    <MediaSheet title={title} onClose={onCancel} busy={busy}>
      <Txt>{body}</Txt>
      {!!error && <Txt>{error}</Txt>}
      <OwnerButton label="Keep media" secondary onPress={onCancel} disabled={busy} />
      <OwnerButton label="Delete permanently" destructive onPress={onConfirm} busy={busy} />
    </MediaSheet>
  );
}

export function PrivateAlbumCover({ path }: { path?: string | null }) {
  const c = useColors();
  const { uri } = usePrivateUrl(path || undefined);
  return (
    <View
      style={{
        height: 120,
        backgroundColor: c.muted,
        borderRadius: 12,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          cachePolicy="none"
          contentFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Icon name="Images" size={32} color={c.mutedForeground} />
      )}
    </View>
  );
}
