import React, { useRef, useState } from "react";
import { View, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SignatureStroke } from "@/lib/salon/agreementPolicy";
import { Action, useColors } from "./ui";
export default function SignaturePad({
  onChange,
  onSigningChange,
  disabled = false,
  height = 100,
}: {
  onChange: (strokes: SignatureStroke[]) => void;
  onSigningChange?: (signing: boolean) => void;
  disabled?: boolean;
  height?: number;
}) {
  const c = useColors();
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const lines = useRef<SignatureStroke[]>([]),
    width = useRef(320),
    callback = useRef(onChange),
    signingCallback = useRef(onSigningChange),
    locked = useRef(disabled);
  callback.current = onChange;
  signingCallback.current = onSigningChange;
  locked.current = disabled;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked.current,
      onMoveShouldSetPanResponder: () => !locked.current,
      onStartShouldSetPanResponderCapture: () => !locked.current,
      onMoveShouldSetPanResponderCapture: () => !locked.current,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        signingCallback.current?.(true);
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
      onPanResponderRelease: () => {
        signingCallback.current?.(false);
        callback.current(lines.current.map((line) => line.map((p) => ({ ...p }))));
      },
      onPanResponderTerminate: () => {
        signingCallback.current?.(false);
        callback.current(lines.current.map((line) => line.map((p) => ({ ...p }))));
      },
      onPanResponderReject: () => signingCallback.current?.(false),
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
          touchAction: "none",
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
      <Action
        label="Clear Signature"
        secondary
        disabled={disabled || strokes.length === 0}
        onPress={() => {
          if (disabled) return;
          lines.current = [];
          setStrokes([]);
          onChange([]);
        }}
        style={{ alignSelf: "flex-start", minHeight: 38 }}
      />
    </View>
  );
}
