import React, { useRef, useState } from "react";
import { View, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SignatureStroke } from "@/lib/salon/agreementPolicy";
import { Txt, LinkText, useColors } from "./ui";
export default function SignaturePad({
  onChange,
  disabled = false,
}: {
  onChange: (strokes: SignatureStroke[]) => void;
  disabled?: boolean;
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
          y: Math.max(0, Math.min(160, e.nativeEvent.locationY)),
        };
        lines.current = [...lines.current, [p]];
        setStrokes(lines.current);
      },
      onPanResponderMove: (e) => {
        const last = lines.current[lines.current.length - 1];
        if (!last || last.length >= 4096) return;
        const p = {
          x: Math.max(0, Math.min(320, (e.nativeEvent.locationX * 320) / width.current)),
          y: Math.max(0, Math.min(160, e.nativeEvent.locationY)),
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
      <Txt bold size={18}>
        Your signature
      </Txt>
      <View
        accessibilityLabel="Draw your signature with your finger or mouse"
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width;
        }}
        {...responder.panHandlers}
        style={{
          height: 160,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.background,
          overflow: "hidden",
        }}
      >
        <Svg
          pointerEvents="none"
          width="100%"
          height={160}
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
        >
          {strokes.map((line, i) => (
            <Path
              key={i}
              d={line.map((p, n) => `${n ? "L" : "M"} ${p.x} ${p.y}`).join(" ")}
              stroke={c.foreground}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
      <Txt size={13} color={c.mutedForeground}>
        Sign using your finger or mouse.
      </Txt>
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
