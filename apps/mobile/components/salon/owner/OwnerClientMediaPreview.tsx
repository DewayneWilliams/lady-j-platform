import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { initialFilters } from "@/lib/salon/media/types";
import { listMedia, signedMedia } from "@/lib/salon/media/api";
import Icon from "@/lib/icons/LucideIcon";
import { useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

export default function OwnerClientMediaPreview({ clientId, demo }: { clientId: string; demo?: boolean }) {
  const c = useColors();
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void listMedia(clientId, { ...initialFilters, kind: "photo" }).then(async ({ items }) => Promise.all(items.slice(0, 3).map((item) => signedMedia(item.thumbnail_path)))).then((next) => { if (active) setUrls(next); }).catch(() => { if (active) setUrls([]); });
    return () => { active = false; };
  }, [clientId, demo]);
  if (!urls.length) return <View style={{ minHeight: 70, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.border, alignItems: "center", justifyContent: "center", gap: 4 }}><Icon name="Images" size={22} color={c.mutedForeground} /><OwnerText size={14} muted>No media added yet.</OwnerText></View>;
  return <View style={{ flexDirection: "row", gap: 8 }}>{urls.map((url, index) => <Image key={url} accessibilityLabel={`Client media thumbnail ${index + 1}`} source={{ uri: url }} style={{ width: "31%", aspectRatio: 1, borderRadius: 14, backgroundColor: c.muted }} />)}</View>;
}
