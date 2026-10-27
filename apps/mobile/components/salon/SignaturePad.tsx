import React, { useRef, useState } from "react";
import { View, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SignatureStroke } from "@/lib/salon/agreementPolicy";
import { Txt, LinkText, useColors } from "./ui";
export default function SignaturePad({
  onChange,
  disabled = false,
  height = 100,
}: {
  onChange: (strokes: SignatureStroke[]) => void;
  disabled?: boolean;
  height?: number;
}) {
  const c = useColors();
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const lines = useRef<SignatureStroke[]>([]),
    width = useRef(320),
    callback = useRef(onChange),
    locked = useRef(disabled);
  callback.current = onChange;
  locked.current = disabled;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked.current,
      onMoveShouldSetPanResponder: () => !locked.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const p = {
          x: Math.max(0, Math.min(320, (e.nativeEvent.locationX * 320) / width.current)),
          y: Math.max(0, Math.min(160, (e.nativeEvent.locationY * 160) / height)),
        };
        lines.current = [...lines.current, [p]];
        setStrokes(lines.current);
      },
      onPanResponderMove: (e) => {
        const last = lines.current[lines.current.length - 1];
        if (!last || last.length >= 4096) return;
        const p = {
          x: Math.max(0, Math.min(320, (e.nativeEvent.locationX * 320) / width.current)),
          y: Math.max(0, Math.min(160, (e.nativeEvent.locationY * 160) / height)),
        };
        const previous = last[last.length - 1];
        if (Math.hypot(p.x - previous.x, p.y - previous.y) < 1) return;
        lines.current = [...lines.current.slice(0, -1), [...last, p]];
        setStrokes(lines.current);
      },
      onPanResponderRelease: () =>
        callback.current(lines.current.map((line) => line.map((p) => ({ ...p })))),
      onPanResponderTerminate: () =>
        callback.current(lines.current.map((line) => line.map((p) => ({ ...p })))),
    }),
  ).current;
  return (
    <View style={{ gap: 8 }}>
      <View
        accessibilityLabel="Draw your signature with your finger or mouse"
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width;
        }}
        {...responder.panHandlers}
        style={{
          height,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        <Svg
          pointerEvents="none"
          width="100%"
          height={height}
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
        >
          {strokes.map((line, i) => (
            <Path
              key={i}
              d={line.map((p, n) => `${n ? "L" : "M"} ${p.x} ${p.y}`).join(" ")}
              stroke="#111111"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
      <LinkText
        onPress={() => {
          if (disabled) return;
          lines.current = [];
          setStrokes([]);
          onChange([]);
        }}
      >
        Clear signature
      </LinkText>
    </View>
  );
}
