import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import Icon from "@/lib/icons/LucideIcon";
import { Txt, useColors } from "../ui";
import { OwnerButton } from "../owner/OwnerUI";
import type { MediaItem } from "@/lib/salon/media/types";
import { mediaDate } from "@/lib/salon/media/types";
import { usePrivateUrl } from "./MediaPrimitives";
function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri, useCaching: false }, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      nativeControls
      allowsPictureInPicture={false}
    />
  );
}
function FullMedia({ item, compare = false }: { item: MediaItem; compare?: boolean }) {
  const c = useColors();
  const { uri, failed } = usePrivateUrl(item.object_path);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 300, height: 300 });
  const tap = useRef(0);
  useEffect(() => setZoom(1), [item.id]);
  return (
    <View style={{ flex: 1, minHeight: 180, gap: 10 }}>
      <View
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        style={{
          flex: 1,
          minHeight: 180,
          backgroundColor: c.muted,
          borderRadius: compare ? 12 : 0,
          overflow: "hidden",
        }}
      >
        {!uri ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            {failed ? (
              <Txt>This item is no longer available. Refresh the gallery to check access.</Txt>
            ) : (
              <ActivityIndicator color={c.brandAccent} />
            )}
          </View>
        ) : item.kind === "video" ? (
          <Player uri={uri} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ minHeight: size.height, justifyContent: "center" }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            <ScrollView
              horizontal
              contentContainerStyle={{
                minWidth: size.width,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Photo. Double tap to zoom."
                onPress={() => {
                  const now = Date.now();
                  if (now - tap.current < 300) setZoom((v) => (v === 1 ? 2 : 1));
                  tap.current = now;
                }}
              >
                <Image
                  source={{ uri }}
                  contentFit="contain"
                  cachePolicy="none"
                  accessibilityLabel={item.name}
                  style={{ width: size.width * zoom, height: size.height * zoom }}
                />
              </Pressable>
            </ScrollView>
          </ScrollView>
        )}
      </View>
      {item.kind === "photo" && !compare && (
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "center" }}
        >
          <OwnerButton
            label="−"
            secondary
            compact
            disabled={zoom <= 1}
            onPress={() => setZoom((v) => Math.max(1, v - 0.5))}
          />
          <Txt size={16}>{Math.round(zoom * 100)}%</Txt>
          <OwnerButton
            label="+"
            secondary
            compact
            disabled={zoom >= 4}
            onPress={() => setZoom((v) => Math.min(4, v + 0.5))}
          />
          <OwnerButton label="Fit" secondary compact onPress={() => setZoom(1)} />
        </View>
      )}
    </View>
  );
}
export default function MediaViewer({
  items,
  index,
  owner,
  onClose,
  onIndex,
  onEdit,
  onFavorite,
  accessControl,
}: {
  items: MediaItem[];
  index: number;
  owner: boolean;
  onClose: () => void;
  onIndex: (i: number) => void;
  onEdit: () => void;
  onFavorite: () => void;
  accessControl?: React.ReactNode;
}) {
  const c = useColors();
  const item = items[index];
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
    };
    globalThis.window.addEventListener("keydown", key);
    return () => globalThis.window.removeEventListener("keydown", key);
  }, [index, items.length, onClose, onIndex]);
  if (!item) return null;
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close viewer"
            onPress={onClose}
            style={{ padding: 12 }}
          >
            <Icon name="X" size={26} color={c.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt size={20} bold>
              {item.name}
            </Txt>
            <Txt size={14} color={c.mutedForeground}>
              {mediaDate(item.display_date)}
            </Txt>
          </View>
          {owner && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.favorite ? "Remove favorite" : "Favorite"}
              onPress={onFavorite}
              style={{ padding: 12 }}
            >
              <Icon name="Heart" size={24} color={item.favorite ? c.brandAccent : c.foreground} />
            </Pressable>
          )}
        </View>
        <FullMedia key={item.id} item={item} />
        {owner && accessControl}
        <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ padding: 18, gap: 8 }}>
          {!!item.caption && <Txt>{item.caption}</Txt>}
          {!!item.tags.length && (
            <Txt size={14} color={c.mutedForeground}>
              {item.tags.map((t) => "#" + t).join(" ")}
            </Txt>
          )}
          {owner && !!item.notes && <Txt size={16}>Owner notes: {item.notes}</Txt>}
          {owner && (
            <Txt size={14} color={c.mutedForeground}>
              {item.allow_client ? "Client access allowed" : "Owner only"} ·{" "}
              {(item.bytes / 1024 / 1024).toFixed(1)} MB
            </Txt>
          )}
        </ScrollView>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, gap: 10 }}
        >
          <OwnerButton
            label="Previous"
            icon="ChevronLeft"
            secondary
            disabled={index === 0}
            onPress={() => onIndex(index - 1)}
          />
          {owner && <OwnerButton label="Details" secondary onPress={onEdit} />}
          <OwnerButton
            label="Next"
            icon="ChevronRight"
            secondary
            disabled={index === items.length - 1}
            onPress={() => onIndex(index + 1)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function MediaComparison({ items, onClose }: { items: MediaItem[]; onClose: () => void }) {
  const c = useColors();
  const [swap, setSwap] = useState(false);
  const { width } = useWindowDimensions();
  const ordered = [...items].sort(
    (a, b) =>
      a.display_date.localeCompare(b.display_date) || a.created_at.localeCompare(b.created_at),
  );
  if (swap) ordered.reverse();
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background, padding: 16, gap: 16 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Txt size={24} bold style={{ flex: 1 }}>
            Before & after
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close comparison"
            onPress={onClose}
            style={{ padding: 12 }}
          >
            <Icon name="X" size={24} color={c.foreground} />
          </Pressable>
        </View>
        <View style={{ flex: 1, flexDirection: width > 650 ? "row" : "column", gap: 16 }}>
          {ordered.map((m, i) => (
            <View key={m.id} style={{ flex: 1, gap: 8, minHeight: 0 }}>
              <Txt bold>
                {i === 0 ? "Before" : "After"} — {mediaDate(m.display_date)}
              </Txt>
              <FullMedia item={m} compare />
              <Txt size={16}>{m.name}</Txt>
            </View>
          ))}
        </View>
        <OwnerButton label="Swap before & after" secondary onPress={() => setSwap((v) => !v)} />
      </SafeAreaView>
    </Modal>
  );
}
