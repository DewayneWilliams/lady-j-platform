import React, { useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Photo, Txt, useColors } from "./ui";

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
  return (
    <View
      style={{ height, overflow: "hidden", borderRadius: 16 }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <FlatList
          ref={list}
          horizontal
          pagingEnabled
          data={items}
          keyExtractor={(item, position) => item + position}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          getItemLayout={(_, position) => ({
            length: width,
            offset: width * position,
            index: position,
          })}
          renderItem={({ item }) => <Photo name={item} style={{ width, height }} />}
        />
      )}
      {items.length > 1 && (
        <>
          {([-1, 1] as const).map((direction) => (
            <Pressable
              key={direction}
              accessibilityRole="button"
              accessibilityLabel={direction < 0 ? "Previous photo" : "Next photo"}
              disabled={direction < 0 ? index === 0 : index === items.length - 1}
              onPress={(event) => {
                event.stopPropagation();
                move(index + direction);
              }}
              style={{
                position: "absolute",
                top: height / 2 - 22,
                [direction < 0 ? "left" : "right"]: 10,
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: (direction < 0 ? index === 0 : index === items.length - 1)
                  ? c.muted
                  : c.card,
              }}
            >
              <Icon
                name={direction < 0 ? "ChevronLeft" : "ChevronRight"}
                size={22}
                color={
                  (direction < 0 ? index === 0 : index === items.length - 1)
                    ? c.mutedForeground
                    : c.foreground
                }
              />
            </Pressable>
          ))}
          <View
            style={{
              position: "absolute",
              bottom: 12,
              alignSelf: "center",
              backgroundColor: c.card,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Txt size={12}>
              {Math.min(index + 1, items.length)} / {items.length}
            </Txt>
          </View>
        </>
      )}
    </View>
  );
}
