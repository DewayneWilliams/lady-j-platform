import React, { useRef, useState } from "react";
import { FlatList } from "react-native";
import { useColors } from "./ui";

export default function CatalogGallery({
  photos,
  cover,
  height = 280,
}: {
  photos?: string[];
  cover: string;
  height?: number;
}) {
  const c = useColors();
  const items = photos?.length ? photos : [cover];
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<string>>(null);
  function move(next: number) {
    const page = Math.max(0, Math.min(items.length - 1, next));
    list.current?.scrollToOffset({ offset: page * width, animated: true });
    setIndex(page);
  }
  return null;
}
